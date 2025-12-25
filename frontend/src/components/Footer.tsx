import React from 'react';
import { Box, Typography } from '@mui/material';

export default function Footer(){
  return (
    <Box component="footer" className="app-footer" sx={{ bgcolor: '#0f172a', color: '#fff', p:2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <Box component="img" src="/logo.svg" alt="Kdb Hopital" sx={{ height: 28, width: 'auto' }} />
        <Typography variant="body2">© {new Date().getFullYear()} Kdb Hospital — Tous droits réservés</Typography>
      </Box>
    </Box>
  );
}
