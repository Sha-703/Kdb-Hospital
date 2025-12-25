import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { Box, Card, CardContent, TextField, Button, Typography, CircularProgress } from '@mui/material';

const Login: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [tenant, setTenant] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const nav = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setLoading(true);
    setError('');
    try{
      await login(username, password);
      if (tenant) localStorage.setItem('tenant_slug', tenant);
      nav('/dashboard');
      window.location.reload();
    }catch(err){
      // show backend error detail when available
      console.error('Login error', err);
      const message = err?.response?.data?.detail || err?.response?.data || err?.message || 'Échec de la connexion';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    }finally{ setLoading(false); }
  }

  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight: '70vh', p:2 }}>
      <Card sx={{ width: 420 }}>
        <CardContent>
              <Typography variant="h5" align="center" sx={{ mb:2 }}>Connexion</Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap:2 }}>
              <TextField label="Nom d'utilisateur" value={username} onChange={e=>setUsername(e.target.value)} fullWidth />
              <TextField label="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} fullWidth />
                  {/* tenant removed - multi-tenant will be provided elsewhere if needed */}
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Se connecter'}
              </Button>
              {error && <Typography color="error">{error}</Typography>}
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
