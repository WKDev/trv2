"use client"

import React, { useState, useEffect, useMemo, memo, useCallback } from "react"
import { formatValueByColumn, formatColumnHeader } from "@/lib/unit-formatters"

interface ReadOnlyVirtualizedTableProps {
  data: any[]
  columns: string[]
  showCheckboxes?: boolean
  onRowSelection?: (rowIndex: number, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  selectedRows?: Set<number>
  rowHeight?: number
  visibleRows?: number
  columnWidths?: { [key: string]: number }
}

export const ReadOnlyVirtualizedTable = memo(({ 
  data, 
  columns, 
  showCheckboxes = false,
  onRowSelection,
  onSelectAll,
  selectedRows = new Set(),
  rowHeight = 40,
  visibleRows = 20,
  columnWidths = {}
}: ReadOnlyVirtualizedTableProps) => {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  // 정렬된 데이터 계산
  const sortedData = useMemo(() => {
    if (!sortConfig) return data
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [data, sortConfig])

  // 가상화를 위한 계산
  const totalHeight = sortedData.length * rowHeight
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(startIndex + visibleRows, sortedData.length)
  const visibleData = sortedData.slice(startIndex, endIndex)

  // 스크롤 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // 컨테이너 높이 설정
  useEffect(() => {
    const updateHeight = () => {
      setContainerHeight(Math.min(600, window.innerHeight * 0.6))
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const handleToggleSelect = (id: number) => {
    if (onRowSelection) {
      onRowSelection(id - 1, !selectedRows.has(id - 1))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked)
    }
  }

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev?.key === column) {
        return prev.direction === 'asc' 
          ? { key: column, direction: 'desc' }
          : null
      }
      return { key: column, direction: 'asc' }
    })
  }

  const handleRowClick = (rowIndex: number) => {
    setSelectedRow(rowIndex)
  }

  // 전체 선택 상태 계산
  const isAllSelected = sortedData.length > 0 && selectedRows.size === sortedData.length
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sortedData.length

  // 기본 컬럼 너비 설정
  const getColumnWidth = (column: string) => {
    if (columnWidths[column]) {
      return columnWidths[column]
    }
    
    // 기본 너비 설정
    const defaultWidths: { [key: string]: number } = {
      'Index': 60,
      'Travelled': 80,
      'Level1': 80,
      'Level2': 80,
      'Level3': 80,
      'Level4': 80,
      'Level5': 80,
      'Level6': 80,
      'Encoder3': 80,
      'Ang1': 80,
      'Ang2': 80,
      'Ang3': 80
    }
    
    return defaultWidths[column] || 100
  }

  return (
    <div className="overflow-x-auto">
      {/* 고정된 헤더 */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex">
          {showCheckboxes && (
            <div className="p-1 text-left text-xs font-medium text-muted-foreground bg-background flex-shrink-0" style={{ width: '32px' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-border w-3 h-3"
              />
            </div>
          )}
          {columns.map((col) => (
            <div 
              key={col} 
              className="p-1 text-left text-xs font-medium text-muted-foreground bg-background cursor-pointer hover:bg-accent/50 select-none flex-shrink-0"
              onClick={() => handleSort(col)}
              style={{ width: `${getColumnWidth(col)}px` }}
            >
              <div className="flex items-center gap-1 truncate">
                {col}
                {sortConfig?.key === col && (
                  <span className="text-primary">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 스크롤 가능한 바디 */}
      <div 
        className="relative"
        style={{ height: containerHeight - 40, overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {/* 가상화된 테이블 바디 */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div 
            style={{ 
              position: 'absolute', 
              top: startIndex * rowHeight,
              width: '100%'
            }}
          >
            {visibleData.map((row, index) => {
              const actualIndex = startIndex + index
              const isSelected = selectedRow === actualIndex
              return (
                <div 
                  key={actualIndex} 
                  className={`flex border-b border-border hover:bg-accent/50 cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                  onClick={() => handleRowClick(actualIndex)}
                  style={{ height: `${rowHeight}px` }}
                >
                  {showCheckboxes && (
                    <div className="p-1 flex-shrink-0" style={{ width: '32px' }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(actualIndex)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleToggleSelect(actualIndex + 1)
                        }}
                        className="rounded border-border w-3 h-3"
                      />
                    </div>
                  )}
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="p-1 text-xs text-foreground flex-shrink-0"
                      style={{ width: `${getColumnWidth(col)}px` }}
                    >
                      <div className="truncate">
                        {formatValueByColumn(col, row[col])}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
})

ReadOnlyVirtualizedTable.displayName = "ReadOnlyVirtualizedTable"
