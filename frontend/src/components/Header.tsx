import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { logout, isAuthenticated, getCurrentUser } from '../api/auth';

const pages = [
  { to: '/patients', label: 'Patients', roles: ['admin','reception','doctor','nurse','billing'] },
  { to: '/appointments', label: 'Rendez-vous', roles: ['admin','reception','doctor','nurse'] },
  { to: '/staff', label: 'Staff', roles: ['admin'] },
  { to: '/actes', label: 'Actes', roles: ['admin','doctor','billing'] },
  { to: '/billing', label: 'Facturation', roles: ['admin','billing'] },
];

export default function Header() {
  const [anchorElNav, setAnchorElNav] = React.useState<HTMLElement | null>(null);
  const nav = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const role = user?.role || user?.roles || user?.is_staff || null;

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  function handleLogout(){
    logout();
    nav('/login');
    window.location.reload();
  }

  // hide header on login page (root or /login)
  if(location.pathname === '/login' || location.pathname === '/') return null;

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box component={RouterLink as any} to={isAuthenticated() ? '/dashboard' : '/login'}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', mr: 2 }}>
            <Box component="img" src="/logo.svg" alt="Kdb Hopital" sx={{ height: 40, width: 'auto', mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              sx={{ color: 'inherit', textDecoration: 'none' }}
            >
              Kdb Hospital
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            >
              {pages.map((p) => (
                <MenuItem key={p.to} onClick={handleCloseNavMenu} component={RouterLink as any} to={p.to}>
                  {p.label}
                </MenuItem>
              ))}
              {!isAuthenticated() ? (
                <MenuItem component={RouterLink as any} to="/login">Login</MenuItem>
              ) : (
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              )}
            </Menu>
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((p) => {
              const uRole = (user && (user.role || user.role_name || user.roles)) || null;
              const roleStr = (typeof uRole === 'string') ? uRole.toLowerCase() : (Array.isArray(uRole) && uRole.length ? String(uRole[0]).toLowerCase() : null);
              // if page has role restrictions, hide when current user role not permitted
              if(p.roles && p.roles.length){
                if(!roleStr || p.roles.map(r => r.toLowerCase()).indexOf(roleStr) === -1) return null;
              }
              return (
                <Button
                  key={p.to}
                  component={RouterLink as any}
                  to={p.to}
                  sx={{ my: 2, color: 'white', display: 'block' }}
                >
                  {p.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            {!isAuthenticated() ? (
              <Button color="inherit" component={RouterLink as any} to="/login">Se connecter</Button>
            ) : (
              <Button color="inherit" onClick={handleLogout}>Se déconnecter</Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
