import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNotifier } from '../contexts/Notifier';

const AppointmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [appt, setAppt] = useState<any | null>(null);
  const notifier = useNotifier();

  useEffect(()=>{
    if (!id) return;
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get(`/api/appointments/${id}/`).then(r=> setAppt(r.data)).catch(e=> console.error(e));
  },[id]);

  function handleDelete(){
    if(!window.confirm('Supprimer ce rendez-vous ?')) return;
    client.delete(`/api/appointments/${id}/`).then(()=> {
      notifier.notify('Rendez-vous supprimé', 'success');
      nav('/appointments');
    }).catch(e=> notifier.notify('Erreur suppression: '+(e.message || e), 'error'));
  }

  if(!appt) return <div>Chargement…</div>;

  function formatDateTime(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Planifié',
    checked_in: 'Enregistré',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };

  async function handleChangeStatus(newStatus: string){
    if(!id) return;
    try{
      const res = await client.patch(`/api/appointments/${id}/`, { status: newStatus });
      setAppt(res.data);
      notifier.notify('Statut mis à jour', 'success');
    }catch(e:any){
      notifier.notify('Erreur mise à jour statut: '+(e?.response?.data||e?.message||e), 'error');
    }
  }

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h4">Rendez-vous</Typography>
      <Card sx={{ mt:2 }}>
        <CardContent>
          <Typography>Patient: {appt.patient}</Typography>
          <Typography>Staff: {appt.staff}</Typography>
          <Typography>Date: {formatDateTime(appt.date)}</Typography>
          <Typography>Lieu: {appt.location}</Typography>
          <Box sx={{ mt:1 }}>
            <FormControl size="small">
              <InputLabel id="status-select-label">Statut</InputLabel>
              <Select
                labelId="status-select-label"
                value={appt.status || ''}
                label="Statut"
                onChange={(e)=> handleChangeStatus(e.target.value as string)}
              >
                <MenuItem value="scheduled">{STATUS_LABELS['scheduled']}</MenuItem>
                <MenuItem value="checked_in">{STATUS_LABELS['checked_in']}</MenuItem>
                <MenuItem value="completed">{STATUS_LABELS['completed']}</MenuItem>
                <MenuItem value="cancelled">{STATUS_LABELS['cancelled']}</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ mt:1 }}>Motif: {appt.reason}</Typography>
          </Box>
          <Box sx={{ mt:2 }}>
            <Button variant="contained" onClick={()=> nav('/appointments')}>Retour</Button>
            <Button variant="outlined" color="error" sx={{ ml:2 }} onClick={handleDelete}>Supprimer</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AppointmentDetail;
