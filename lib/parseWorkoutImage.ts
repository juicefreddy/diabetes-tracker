export interface WorkoutData {
  duration_minutes?: number
  distance_km?: number
  calories?: number
  avg_heart_rate?: number
  elevation?: number
}

// 다크모드 스크린샷을 OCR하기 위해 밝기 감지 후 색상 반전
function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const maxSize = 1500
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      // 중앙 50×50 샘플로 평균 밝기 측정
      const sz = Math.min(50, w, h)
      const sample = ctx.getImageData(Math.floor(w / 2 - sz / 2), Math.floor(h / 2 - sz / 2), sz, sz)
      let brightness = 0
      for (let i = 0; i < sample.data.length; i += 4) {
        brightness += sample.data[i] * 0.299 + sample.data[i + 1] * 0.587 + sample.data[i + 2] * 0.114
      }
      brightness /= sample.data.length / 4

      if (brightness < 80) {
        // 다크 배경 → 색상 반전으로 OCR 정확도 향상
        const id = ctx.getImageData(0, 0, w, h)
        for (let i = 0; i < id.data.length; i += 4) {
          id.data[i] = 255 - id.data[i]
          id.data[i + 1] = 255 - id.data[i + 1]
          id.data[i + 2] = 255 - id.data[i + 2]
        }
        ctx.putImageData(id, 0, 0)
      }

      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    }
    img.src = url
  })
}

function extractWorkoutData(text: string): WorkoutData {
  const result: WorkoutData = {}

  // 운동 시간: H:MM:SS 또는 MM:SS 형식
  const timeHMS = text.match(/(\d{1,2}):(\d{2}):(\d{2})/)
  if (timeHMS) {
    const h = parseInt(timeHMS[1]), m = parseInt(timeHMS[2]), s = parseInt(timeHMS[3])
    result.duration_minutes = Math.round((h * 60 + m + s / 60) * 10) / 10
  } else {
    const korTime = text.match(/(\d+)\s*분\s*(\d+)\s*초/)
    if (korTime) {
      result.duration_minutes = Math.round((parseInt(korTime[1]) + parseInt(korTime[2]) / 60) * 10) / 10
    }
  }

  // 거리: km 단위 우선, 없으면 m 단위 변환
  const kmMatch = text.match(/(\d+(?:[.,]\d+)?)\s*km/i)
  if (kmMatch) {
    result.distance_km = parseFloat(kmMatch[1].replace(',', '.'))
  } else {
    // "425M", "425m", "425미터" — BPM과 구분하기 위해 뒤에 숫자 없는 경우만 매치
    const mMatch = text.match(/(\d{2,6})\s*(?:M(?![\w])|m(?![\w])|미터)/)
    if (mMatch) {
      const meters = parseInt(mMatch[1])
      if (meters > 10 && meters < 100000) {
        result.distance_km = Math.round(meters / 10) / 100
      }
    }
  }

  // 칼로리: 여러 값이 있으면 가장 큰 값(총 칼로리) 사용
  const calMatches = [...text.matchAll(/(\d+)\s*(?:KCAL|kcal|Kcal|칼로리)/g)]
  if (calMatches.length > 0) {
    result.calories = Math.max(...calMatches.map(m => parseInt(m[1])))
  }

  // 평균 심박수: BPM 앞의 숫자
  const hrMatch = text.match(/(\d{2,3})\s*BPM/i) || text.match(/(\d{2,3})\s*bpm/)
  if (hrMatch) {
    const hr = parseInt(hrMatch[1])
    if (hr >= 40 && hr <= 250) result.avg_heart_rate = hr
  }

  // 고도 (상승)
  const elevMatch =
    text.match(/고도[^0-9]*(\d+(?:[.,]\d+)?)\s*m/i) ||
    text.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:상승|고도)/i) ||
    text.match(/상승\s*고도[^0-9]*(\d+)/i)
  if (elevMatch) {
    result.elevation = parseFloat(elevMatch[1].replace(',', '.'))
  }

  return result
}

export async function parseWorkoutImage(file: File): Promise<WorkoutData> {
  const processedDataUrl = await preprocessImage(file)
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data: { text } } = await worker.recognize(processedDataUrl)
    return extractWorkoutData(text)
  } finally {
    await worker.terminate()
  }
}
