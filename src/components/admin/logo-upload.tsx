'use client'

import { useState, useRef } from 'react'

interface LogoUploadProps {
  currentLogoUrl?: string | null
}

export function LogoUpload({ currentLogoUrl }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(currentLogoUrl ?? null)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Logo</label>
      <div className="mt-1 flex items-center gap-4">
        {preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview}
            alt="Logo preview"
            className="h-16 w-16 rounded-md border border-gray-200 object-contain"
          />
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            PNG, JPEG, SVG of WebP. Maximaal 2MB.
          </p>
        </div>
      </div>
    </div>
  )
}
