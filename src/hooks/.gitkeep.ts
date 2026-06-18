// Example custom hook
// You can create your custom React hooks here

import { useState } from 'react'

export function useExample() {
  const [value, setValue] = useState<string>('')

  return {
    value,
    setValue,
  }
}
