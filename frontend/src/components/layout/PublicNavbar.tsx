import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Drawer,
  List, ListItem, ListItemText, Box, Container, useMediaQuery,
  useTheme, Divider, ListItemButton, Dialog, DialogTitle,
  DialogContent, DialogActions, ListItemIcon,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { label: 'Home',                 path: '/'               },
  { label: 'About Venue',          path: '/about'          },
  { label: 'Gallery',              path: '/gallery'        },
  { label: 'Contact Us',           path: '/contact'        },
  { label: 'Apply Refund',         path: '/refunds'        },
  { label: 'Track Refund',         path: '/track-refund'   },
  { label: 'Print Booking Details',path: '/print-booking'  },
];

const PublicNavbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const openTerms = () => setTermsOpen(true);
  const closeTerms = () => setTermsOpen(false);
  const acceptTerms = () => { setTermsOpen(false); navigate('/book'); };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ displayPrint: 'none' }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ py: 1, gap: 2 }}>
            {/* Logo */}
            <Box
              component={Link}
              to="/"
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', flexGrow: { xs: 1, md: 0 } }}
            >
              <AccountBalanceIcon sx={{ fontSize: 36, color: '#c9a227' }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.1, fontSize: '1rem' }}>
                  Hutatma Smruti Mandir
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>
                  Venue Booking System
                </Typography>
              </Box>
            </Box>

            {/* Desktop nav */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto', alignItems: 'center' }}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    sx={{
                      color: isActive(item.path) ? '#c9a227' : 'rgba(255,255,255,0.9)',
                      fontWeight: isActive(item.path) ? 700 : 500,
                      fontSize: '0.85rem',
                      px: 1.5,
                      borderBottom: isActive(item.path) ? '2px solid #c9a227' : '2px solid transparent',
                      borderRadius: 0,
                      '&:hover': { color: '#c9a227', backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={openTerms}
                  sx={{ ml: 2, py: 0.8 }}
                >
                  Book Now
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate('/admin/login')}
                  sx={{ py: 0.8 }}
                >
                  Admin Login
                </Button>
              </Box>
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)} edge="end">
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1a3a6b' }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Menu</Typography>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                selected={isActive(item.path)}
                sx={{
                  '&.Mui-selected': { bgcolor: 'rgba(26,58,107,0.08)', color: '#1a3a6b' },
                  '&.Mui-selected .MuiListItemText-primary': { fontWeight: 700 },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ my: 1 }} />
          <ListItem>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => { setDrawerOpen(false); openTerms(); }}
            >
              Book Now
            </Button>
          </ListItem>
          <ListItem>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              component={Link}
              to="/admin/login"
              onClick={() => setDrawerOpen(false)}
            >
              Admin Login
            </Button>
          </ListItem>
        </List>
      </Drawer>
      <Dialog open={termsOpen} onClose={closeTerms} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>नियम व अटी</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2, color: '#1a3a6b', fontWeight: 700 }}>
            कृपया खालील नियम आणि अटी वाचा आणि स्वीकारा.
          </Typography>
          <List disablePadding>
            {[
              'बुकिंग करण्यापूर्वी, वेबसाइटवरील सर्व माहिती पूर्ण व अचूक असल्याची खात्री करा.',
              'बुकिंग पुष्टीकरणासाठी देयक वेळेत जमा करणे आवश्यक आहे.',
              'बुकिंग रद्द अथवा बदल करण्यासाठी संस्थेने निर्धारित नियम व शुल्क लागू होतील.',
              'बुकिंग अधिकृत झाल्यानंतर कोणतीही तांत्रिक किंवा प्रशासकीय मुदत असल्यास तात्काळ कळवा.',
              'फक्त अधिकृत बँक खात्यावरच देयक करावे; अनधिकृत खात्यांना पैसे देऊ नका.',
            ].map((text) => (
              <ListItem key={text} disableGutters>
                <ListItemIcon sx={{ minWidth: 32, color: '#2e7d32' }}>
                  <CheckCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeTerms}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={acceptTerms}>
            I accept the terms and conditions
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PublicNavbar;
