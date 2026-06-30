import React from 'react'
import { Card, CardContent, Box, Typography } from '@mui/material'
import { ArrowUpward, ArrowDownward } from '@mui/icons-material'

export default function MetricCard({ title, value, subtitle, color, icon, trend }) {
  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `${color}15` }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {trend >= 0 ? <ArrowUpward sx={{ fontSize: 14, color: 'success.main' }} /> : <ArrowDownward sx={{ fontSize: 14, color: 'error.main' }} />}
                <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'} fontWeight={600}>{Math.abs(trend)}%</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
            {React.cloneElement(icon, { sx: { color, fontSize: 24 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
