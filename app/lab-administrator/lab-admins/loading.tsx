import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Loading() {
  return (
    <div className="container mx-auto py-6">
      <Skeleton className="h-8 w-64 mb-6" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-10 w-64" />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-blue-50 font-medium">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="bg-blue-50 font-medium">
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead className="bg-blue-50 font-medium">
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead className="bg-blue-50 font-medium">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="bg-blue-50 font-medium">
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead className="bg-blue-50 font-medium text-right">
                    <Skeleton className="h-4 w-14 ml-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between space-x-6 mt-4">
            <Skeleton className="h-4 w-64" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
