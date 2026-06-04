/**
 * GET /api/pdf/monthly/[workshopId]/[month]
 * Reporte mensual del taller. month = "YYYY-MM"
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { prisma } from '@/lib/db'
import { MonthlyReportPDF } from '@/lib/pdf/monthly-report'
import { NotFoundError, withErrorHandler } from '@/lib/errors'
import { startOfMonth, endOfMonth, eachWeekOfInterval, format } from 'date-fns'
import { es } from 'date-fns/locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withErrorHandler(async (
  _req: NextRequest,
  { params }: { params: { workshopId: string; month: string } },
) => {
  const [year, mon] = params.month.split('-').map(Number)
  const monthStart = startOfMonth(new Date(year, mon - 1, 1))
  const monthEnd   = endOfMonth(monthStart)

  const workshop = await prisma.workshop.findUnique({ where: { id: params.workshopId } })
  if (!workshop) throw new NotFoundError('Taller')

  const orders = await prisma.workOrder.findMany({
    where: {
      workshopId:  params.workshopId,
      completedAt: { gte: monthStart, lte: monthEnd },
    },
    include: { orderItems: true },
  })

  const completed  = orders.filter(o => o.status === 'COMPLETED')
  const cancelled  = orders.filter(o => o.status === 'CANCELLED')
  const totalRev   = completed.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
  const laborRev   = completed.reduce((s, o) => s + Number(o.laborAmount ?? 0), 0)
  const partsRev   = completed.reduce((s, o) => s + Number(o.partsAmount ?? 0), 0)

  // NPS
  const npsOrders = completed.filter(o => o.npsScore !== null)
  const npsAvg    = npsOrders.length > 0
    ? npsOrders.reduce((s, o) => s + (o.npsScore ?? 0), 0) / npsOrders.length
    : 0
  const npsDist   = Array(11).fill(0)
  npsOrders.forEach(o => { if (o.npsScore !== null) npsDist[o.npsScore]++ })

  // Top services
  const svcMap: Record<string, { count: number; revenue: number }> = {}
  for (const o of completed) {
    for (const item of o.orderItems) {
      if (!svcMap[item.taskName]) svcMap[item.taskName] = { count: 0, revenue: 0 }
      svcMap[item.taskName].count++
      svcMap[item.taskName].revenue += Number(item.laborPrice ?? 0) + Number(item.partPrice ?? 0)
    }
  }
  const topSvcs = Object.entries(svcMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Weekly revenue
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd })
  const weeklyRevenue = weeks.map((weekStart, i) => {
    const weekEnd = i < weeks.length - 1 ? weeks[i + 1] : monthEnd
    const amt = completed
      .filter(o => o.completedAt! >= weekStart && o.completedAt! < weekEnd)
      .reduce((s, o) => s + Number(o.totalAmount ?? 0), 0)
    return { week: `Sem. ${i + 1} (${format(weekStart, 'd/MM')})`, amount: amt }
  })

  // Tiempo
  const items = completed.flatMap(o => o.orderItems).filter(i => i.realMinutes && i.estimatedMinutes)
  const avgDev = items.length > 0
    ? items.reduce((s, i) => s + Math.abs((i.realMinutes! - i.estimatedMinutes!) / i.estimatedMinutes! * 100), 0) / items.length
    : 0

  const data = {
    workshopName:    workshop.name,
    workshopAddress: workshop.address,
    month:           monthStart,
    generatedAt:     new Date(),
    totalOrders:     orders.length,
    completedOrders: completed.length,
    cancelledOrders: cancelled.length,
    totalRevenue:    totalRev,
    laborRevenue:    laborRev,
    partsRevenue:    partsRev,
    avgCompletionHours: 0,
    avgTimeDeviationPct: Math.round(avgDev),
    npsAverage:     npsAvg,
    npsCount:       npsOrders.length,
    npsDistribution: npsDist,
    currentScore:   Math.round(workshop.score),
    prevScore:      Math.round(workshop.score - 2),  // placeholder
    topServices:    topSvcs,
    weeklyRevenue,
  }

  const buffer = await renderToBuffer(
    React.createElement(MonthlyReportPDF, { d: data }) as React.ReactElement<DocumentProps>,
  )
  const monthLabel = format(monthStart, 'yyyy-MM')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="reporte-${monthLabel}-${workshop.name.replace(/\s+/g,'-')}.pdf"`,
    },
  })
})
