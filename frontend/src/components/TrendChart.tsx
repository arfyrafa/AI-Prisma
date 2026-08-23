import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

import type { HistoryPoint, ProcessParameter } from '../types'
import { decimalsFor } from '../utils/format'

export interface TrendSeries {
  parameter: string
  label: string
  color: string
}

interface Props {
  points: HistoryPoint[]
  series: TrendSeries[]
  /** Drawn as target / limit lines when a single series is displayed. */
  reference?: ProcessParameter | null
  height?: number
  predicted?: { timestamp: string; value: number } | null
}

const AXIS_COLOR = '#DCE3EC'
const TEXT_COLOR = '#5A6B80'

export function TrendChart({ points, series, reference, height = 320, predicted = null }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const digits = decimalsFor(series[0]?.parameter ?? '')

    // Loosely typed on purpose: the markLine data shape differs between echarts versions.
    const markLines: any[] = []
    if (reference && series.length === 1) {
      if (reference.target_value !== null) {
        markLines.push({
          yAxis: reference.target_value,
          name: 'Target',
          lineStyle: { color: '#1B4F91', type: 'dashed', width: 1.5 },
          label: { formatter: 'Target', color: '#1B4F91', fontSize: 11, position: 'insideEndTop' },
        })
      }
      if (reference.maximum_value !== null) {
        markLines.push({
          yAxis: reference.maximum_value,
          name: 'Batas atas',
          lineStyle: { color: '#C2261D', type: 'dotted', width: 1.5 },
          label: { formatter: 'Batas atas', color: '#C2261D', fontSize: 11, position: 'insideEndTop' },
        })
      }
      if (reference.minimum_value !== null) {
        markLines.push({
          yAxis: reference.minimum_value,
          name: 'Batas bawah',
          lineStyle: { color: '#B45309', type: 'dotted', width: 1.5 },
          label: {
            formatter: 'Batas bawah',
            color: '#B45309',
            fontSize: 11,
            position: 'insideEndBottom',
          },
        })
      }
    }

    const dataSeries: echarts.SeriesOption[] = series.map((item, index) => ({
      name: item.label,
      type: 'line',
      showSymbol: false,
      smooth: 0.2,
      lineStyle: { width: 2, color: item.color },
      itemStyle: { color: item.color },
      areaStyle:
        series.length === 1
          ? { color: 'rgba(46, 111, 208, 0.08)' }
          : undefined,
      data: points.map((point) => [point.timestamp, point.values[item.parameter] ?? null]),
      markLine: index === 0 && markLines.length ? { symbol: 'none', data: markLines } : undefined,
    }))

    if (predicted && points.length) {
      const lastPoint = points[points.length - 1]
      const lastValue = lastPoint.values[series[0].parameter]
      dataSeries.push({
        name: 'Prediksi',
        type: 'line',
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2, type: 'dashed', color: '#7B4FBF' },
        itemStyle: { color: '#7B4FBF' },
        data: [
          [lastPoint.timestamp, lastValue ?? null],
          [predicted.timestamp, predicted.value],
        ],
      })
    }

    chart.setOption(
      {
        grid: { left: 52, right: 20, top: 32, bottom: 56 },
        legend: {
          show: series.length > 1 || Boolean(predicted),
          top: 0,
          right: 0,
          icon: 'roundRect',
          itemWidth: 12,
          itemHeight: 3,
          textStyle: { color: TEXT_COLOR, fontSize: 11 },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#0D1B2C',
          borderWidth: 0,
          textStyle: { color: '#FFFFFF', fontSize: 12 },
          axisPointer: { type: 'line', lineStyle: { color: '#8A98AA' } },
          valueFormatter: (value: unknown) =>
            typeof value === 'number' ? value.toFixed(digits) : '—',
        },
        xAxis: {
          type: 'time',
          axisLine: { lineStyle: { color: AXIS_COLOR } },
          axisLabel: { color: TEXT_COLOR, fontSize: 11, hideOverlap: true },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLine: { show: false },
          axisLabel: { color: TEXT_COLOR, fontSize: 11 },
          splitLine: { lineStyle: { color: AXIS_COLOR, type: 'dashed' } },
        },
        dataZoom: [
          { type: 'inside', throttle: 60 },
          {
            type: 'slider',
            height: 20,
            bottom: 8,
            borderColor: AXIS_COLOR,
            fillerColor: 'rgba(46, 111, 208, 0.12)',
            handleStyle: { color: '#1B4F91' },
            textStyle: { color: TEXT_COLOR, fontSize: 10 },
          },
        ],
        series: dataSeries,
      },
      { notMerge: true },
    )
  }, [points, series, reference, predicted])

  return <div ref={containerRef} style={{ height }} className="w-full" />
}
