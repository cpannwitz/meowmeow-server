export function shuffleArray<T>(array: T[]) {
  console.log(`LOG | : array`, array)
  const arr = [...array]
  console.log(`LOG | : arr`, arr)
  let x: T, i: number, j: number
  for (i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = arr[i]
    arr[i] = arr[j]
    arr[j] = x
  }
  return arr
}
