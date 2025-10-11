/**
 * 데이터 단위 변환 및 포맷팅 함수들
 */

/**
 * ISO 8601 확장 형식 + 타임존(offset) 형식의 타임스탬프를 포맷팅
 * @param timestamp ISO 8601 형식의 타임스탬프 문자열
 * @returns ISO 8601 확장 형식 + 타임존 문자열
 */
export function formatTimestamp(timestamp: string | number): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return String(timestamp)
    }
    
    // ISO 8601 확장 형식 + 타임존(offset) 형식으로 변환
    // 예: 2023-09-25T14:30:45.123+09:00
    return date.toISOString().replace('Z', '+09:00')
  } catch (error) {
    return String(timestamp)
  }
}

/**
 * 속도를 km/h 단위로 포맷팅
 * @param velocity 속도 값
 * @returns km/h 단위가 포함된 문자열
 */
export function formatVelocity(velocity: number): string {
  return `${velocity.toFixed(2)} km/h`
}

/**
 * 거리를 {A}+{BBB}.{CC}m 형식으로 변환
 * @param travelled 거리 값 (예: 1510.03)
 * @returns {A}+{BBB}.{CC}m 형식의 문자열 (예: 1+510.03m)
 * B 영역은 3자리, C 영역은 2자리 유지
 */
export function formatTravelled(travelled: number): string {
  // 전체 값을 1000으로 나누어 km 단위로 변환
  const totalMeters = travelled
  const km = Math.floor(totalMeters / 1000)
  const remainingMeters = totalMeters % 1000
  
  // 남은 미터를 m.cm 형식으로 변환
  const meters = Math.floor(remainingMeters)
  const centimeters = Math.round((remainingMeters - meters) * 100)
  
  // cm이 100이 되면 m으로 올림
  if (centimeters >= 100) {
    const adjustedMeters = meters + 1
    const adjustedCm = centimeters - 100
    return `${km}+${adjustedMeters.toString().padStart(3, '0')}.${adjustedCm.toString().padStart(2, '0')}m`
  }
  
  return `${km}+${meters.toString().padStart(3, '0')}.${centimeters.toString().padStart(2, '0')}m`
}

/**
 * 레벨 값을 mm 단위로 포맷팅
 * @param level 레벨 값
 * @returns mm 단위가 포함된 문자열
 */
export function formatLevel(level: number): string {
  return `${level.toFixed(2)} mm`
}

/**
 * 인코더 값을 숫자로 포맷팅 (단위 없음)
 * @param encoder 인코더 값
 * @returns 포맷팅된 숫자 문자열
 */
export function formatEncoder(encoder: number): string {
  return encoder.toFixed(0)
}

/**
 * Index 값을 정수로 포맷팅
 * @param index Index 값
 * @returns 정수 문자열
 */
export function formatIndex(index: number | string | undefined | null): string {
  if (index === undefined || index === null) {
    return '0'
  }
  const numValue = typeof index === 'string' ? parseInt(index) : index
  if (isNaN(numValue)) {
    return '0'
  }
  return Math.floor(numValue).toString()
}

/**
 * 인코더3 값을 mm 단위로 포맷팅
 * @param encoder3 인코더3 값
 * @returns mm 단위가 포함된 문자열
 */
export function formatEncoder3(encoder3: number): string {
  return `${encoder3.toFixed(2)} mm`
}

/**
 * 각도를 도(°) 단위로 포맷팅
 * @param angle 각도 값
 * @returns 도(°) 단위가 포함된 문자열
 */
export function formatAngle(angle: number): string {
  return `${angle.toFixed(2)}°`
}

/**
 * 컬럼명에 따라 적절한 포맷터를 반환
 * @param columnName 컬럼명
 * @param value 값
 * @returns 포맷팅된 문자열
 */
export function formatValueByColumn(columnName: string, value: number | string | undefined | null): string {
  // undefined나 null인 경우 기본값 반환
  if (value === undefined || value === null) {
    const lowerColumnName = columnName.toLowerCase()
    if (lowerColumnName === 'index') {
      return '0'
    }
    return '0.00'
  }
  
  // 숫자가 아닌 경우 그대로 반환
  if (typeof value !== 'number' || isNaN(value)) {
    return String(value)
  }

  const lowerColumnName = columnName.toLowerCase()
  
  // Index 컬럼 처리
  if (lowerColumnName === 'index') {
    return formatIndex(value)
  }
  
  // No. 컬럼 처리 (연결부 단차 테이블용)
  if (lowerColumnName === 'no.' || lowerColumnName === 'no') {
    return formatIndex(value)
  }
  
  // Timestamp 컬럼 처리
  if (lowerColumnName.includes('timestamp') || lowerColumnName === 'timestamp') {
    return formatTimestamp(value)
  }
  
  // Velocity 컬럼 처리
  if (lowerColumnName.includes('velocity') || lowerColumnName === 'velocity') {
    return formatVelocity(value)
  }
  
  // Travelled 컬럼 처리
  if (lowerColumnName.includes('travelled') || lowerColumnName === 'travelled') {
    return formatTravelled(value)
  }
  
  // Position 컬럼 처리 (연결부 단차 테이블용)
  if (lowerColumnName === 'position') {
    return formatTravelled(value)
  }
  
  // Level1~Level6 컬럼 처리
  if (lowerColumnName.startsWith('level') && /level[1-6]/.test(lowerColumnName)) {
    return formatLevel(value)
  }
  
  // Encoder1, Encoder2 컬럼 처리
  if (lowerColumnName === 'encoder1' || lowerColumnName === 'encoder2') {
    return formatEncoder(value)
  }
  
  // Encoder3 컬럼 처리
  if (lowerColumnName === 'encoder3') {
    return formatEncoder3(value)
  }
  
  // Ang1~Ang3 컬럼 처리
  if (lowerColumnName.startsWith('ang') && /ang[1-3]/.test(lowerColumnName)) {
    return formatAngle(value)
  }
  
  // 기본값: 소수점 2자리까지 표시
  return value.toFixed(2)
}

/**
 * 컬럼명을 그대로 반환 (단위 표기 제거)
 * @param columnName 컬럼명
 * @returns 원본 컬럼명
 */
export function formatColumnHeader(columnName: string): string {
  return columnName
}
