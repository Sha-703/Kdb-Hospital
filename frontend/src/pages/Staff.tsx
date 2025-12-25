import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import { useNotifier } from '../contexts/Notifier';
import StaffForm from '../components/StaffForm';
import { ROLE_LABELS } from '../constants/roles';
import DataList from '../components/DataList';
import { getCurrentUser } from '../api/auth';

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [form, setForm] = useState<Record<string, any>>({});

  const nav = useNavigate();

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get('/api/staff/').then(r=> setStaff(r.data)).catch(e=> console.error(e)).finally(()=> setLoading(false));
  },[]);

  const notifier = useNotifier();

  // only allow admin role
  const user = getCurrentUser();
  const role = user?.role || user?.roles || null;
  if(!user || (typeof role === 'string' && role.toLowerCase() !== 'admin')){
    // redirect to dashboard if not admin
    if(!loading) nav('/dashboard');
    return null;
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement)) as any;
    client.post('/api/staff/', data).then(r=> {
      setStaff([r.data, ...staff]);
      notifier.notify('Membre du personnel ajouté', 'success');
    }).catch(err=> notifier.notify('Erreur: '+(err.response?.data || err.message), 'error'));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>){
    const { name, value } = e.target as HTMLInputElement;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // map internal role values to French labels (keep in sync with StaffForm.ROLES)
  const ROLE_LABELS: Record<string, string> = {
    doctor: 'Médecin',
    nurse: 'Infirmier',
    reception: 'Réceptionniste',
    billing: 'Caissier',
    admin: 'Administrateur',
  };

  const columns = [
    { field: 'display_name', title: 'Nom' },
    { field: 'role', title: 'Rôle', render: (row: any) => (ROLE_LABELS[row.role] || row.role) },
    { field: 'email', title: 'Email' },
    { field: 'actions', title: 'Actions', render: (row: any) => (
      row.user ? 'Compte créé' : (
          <button onClick={async () => {
          const pwd = window.prompt('Mot de passe pour le nouvel utilisateur (obligatoire)') || '';
          if (!pwd) { notifier.notify('Mot de passe requis', 'warning'); return; }
          const username = window.prompt('Nom d\'utilisateur (laisser vide pour auto)') || undefined;
          try {
            const payload: any = { password: pwd };
            if (username) payload.username = username;
            const res = await client.post(`/api/staff/${row.id}/create_user/`, payload);
            // update staff list with returned data
            setStaff(s => s.map(st => st.id === row.id ? res.data : st));
            notifier.notify('Utilisateur créé', 'success');
          } catch (e: any) {
            notifier.notify('Erreur création utilisateur: ' + (e?.response?.data || e?.message || e), 'error');
          }
        }}>Créer utilisateur</button>
      )
    ) },
  ];

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h4">Personnel</Typography>
      <Grid container spacing={2} sx={{ mt:1 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Ajouter un membre</Typography>
              <StaffForm value={form} onChange={handleChange} onSubmit={(e)=>{
                handleCreate(e);
                // reset form after submit
                setForm({});
              }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste</Typography>
              {loading ? <CircularProgress /> : <DataList columns={columns} rows={staff} />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Staff;
