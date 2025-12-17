import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConversionMatch } from '../types'

interface ConversionResultsProps {
  results: ConversionMatch[]
  isLoading: boolean
  error: string | null
  type: 'teeth' | 'gum'
  tempSelectedMatch?: ConversionMatch | null
  onSelectMatch: (match: ConversionMatch) => void
  onPerformConversion?: () => void
  selectedShadeSystem: string
  selectedIndividualShade: string
}

export const ConversionResults: React.FC<ConversionResultsProps> = ({
  results,
  isLoading,
  error,
  type,
  tempSelectedMatch,
  onSelectMatch,
  onPerformConversion,
  selectedShadeSystem,
  selectedIndividualShade
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 flex-shrink-0">
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="ml-2 text-gray-600">Converting shade...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-md flex-shrink-0">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 flex-1 flex flex-col">
        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Shades Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any shades matching <span className="font-semibold">{selectedIndividualShade}</span> from <span className="font-semibold">{selectedShadeSystem}</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      <h3 className="text-lg font-semibold text-gray-900 flex-shrink-0">Shade Conversion Results</h3>
      <p className="text-sm text-gray-600 flex-shrink-0">
        Found {results.length} matching shades:
      </p>
      <div
        className="grid gap-3 conversion-results-scroll overflow-y-auto overflow-x-hidden"
        style={{ 
          maxHeight: '400px',
          minHeight: '250px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        {results.map((match) => (
          <div key={match.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {type === 'teeth' ? (
                  <>
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.incisal || '#FFFFFF' }}
                      title="Incisal"
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.body || '#FFFFFF' }}
                      title="Body"
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.cervical || '#FFFFFF' }}
                      title="Cervical"
                    />
                  </>
                ) : (
                  <>
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.top || '#FFFFFF' }}
                      title="Top"
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.middle || '#FFFFFF' }}
                      title="Middle"
                    />
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: match.color_codes.bottom || '#FFFFFF' }}
                      title="Bottom"
                    />
                  </>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{match.name}</p>
                <p className="text-sm text-gray-600">{match.brand.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${
                match.match_percentage > 80 ? 'bg-green-500' : 
                match.match_percentage > 60 ? 'bg-yellow-500' : 
                'bg-red-500'
              } text-white`}>
                {match.match_percentage}%
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectMatch(match)}
                className={`text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${
                  tempSelectedMatch?.id === match.id ? 'bg-blue-100 border-blue-300' : ''
                }`}
              >
                {tempSelectedMatch?.id === match.id ? 'Selected' : 'Select'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
