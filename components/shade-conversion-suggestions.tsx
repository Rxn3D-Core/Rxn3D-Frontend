"use client"

import { ShadeMatch } from "@/services/shade-api-service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight } from "lucide-react"

interface ShadeConversionSuggestionsProps {
  suggestions: ShadeMatch[]
  isLoading: boolean
  onSelectSuggestion?: (suggestion: ShadeMatch) => void
  title?: string
  type?: 'teeth' | 'gum'
}

export function ShadeConversionSuggestions({
  suggestions,
  isLoading,
  onSelectSuggestion,
  title = "Conversion Suggestions",
  type = 'teeth'
}: ShadeConversionSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Finding conversion suggestions...</span>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-4 h-4 text-blue-600" />
        <h4 className="font-medium text-blue-900">{title}</h4>
      </div>
      
      <div className="space-y-2">
        {suggestions.slice(0, 3).map((suggestion) => (
          <div 
            key={suggestion.id} 
            className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectSuggestion?.(suggestion)}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {type === 'teeth' ? (
                  <>
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.incisal || '#FFFFFF' }}
                      title="Incisal"
                    />
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.body || '#FFFFFF' }}
                      title="Body"
                    />
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.cervical || '#FFFFFF' }}
                      title="Cervical"
                    />
                  </>
                ) : (
                  <>
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.top || '#FFFFFF' }}
                      title="Top"
                    />
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.middle || '#FFFFFF' }}
                      title="Middle"
                    />
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: suggestion.color_codes.bottom || '#FFFFFF' }}
                      title="Bottom"
                    />
                  </>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{suggestion.name}</p>
                <p className="text-xs text-gray-600">{suggestion.brand.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${
                suggestion.match_percentage > 80 ? 'bg-green-500' : 
                suggestion.match_percentage > 60 ? 'bg-yellow-500' : 
                'bg-red-500'
              } text-white`}>
                {suggestion.match_percentage}%
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="text-xs px-2 py-1 h-6"
              >
                Use
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {suggestions.length > 3 && (
        <p className="text-xs text-gray-500 mt-2">
          +{suggestions.length - 3} more suggestions available
        </p>
      )}
    </div>
  )
}

