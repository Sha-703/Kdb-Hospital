import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../api/auth';
import client from '../api/client';
import { Box, Typography, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import InventoryForm from '../components/InventoryForm';
import DataList from '../components/DataList';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(()=>{
    if (!isAuthenticated()) { nav('/login'); return; }
    client.get('/api/inventory/').then(r=> setItems(r.data)).catch(e=> console.error(e)).finally(()=> setLoading(false));
  },[]);

  const nav = useNavigate();
  function handleCreate(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement)) as any;
    client.post('/api/inventory/', data).then(r=> setItems([r.data, ...items])).catch(err=> alert('Erreur: '+err.message));
  }

  const columns = [
    { field: 'sku', title: 'SKU' },
    { field: 'name', title: 'Nom' },
    { field: 'quantity', title: 'Quantité' },
    { field: 'location', title: 'Emplacement' },
  ];

  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h4">Inventaire</Typography>
      <Grid container spacing={2} sx={{ mt:1 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Ajouter un article</Typography>
              <InventoryForm value={{}} onChange={()=>{}} onSubmit={handleCreate} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Liste</Typography>
              {loading ? <CircularProgress /> : <DataList columns={columns} rows={items} />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Inventory;
