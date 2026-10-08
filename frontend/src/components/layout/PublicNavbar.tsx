import React, { useEffect, useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Drawer,
  List, ListItem, ListItemText, Box, Container, useMediaQuery,
  useTheme, Divider, ListItemButton, Dialog, DialogTitle,
  DialogContent, DialogActions, ListItemIcon, Collapse, Menu, MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type PublicNavItem = { label: string; path?: string; children?: Array<{ label: string; path: string }> };

export const publicNavItems = [
  { label: 'Home',                 path: '/'               },
  { label: 'About Venue',          path: '/about'          },
  { label: 'Gallery',              path: '/gallery'        },
  { label: 'Contact Us',           path: '/contact'        },
  { label: 'Refund', children: [
    { label: 'Apply for Cancellation', path: '/cancel-booking' },
    { label: 'Apply Refund', path: '/refunds' },
    { label: 'Track Refund', path: '/track-refund' },
  ] },
  { label: 'Print Booking Details',path: '/print-booking'  },
] as PublicNavItem[];

const PublicNavbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [refundAnchorEl, setRefundAnchorEl] = useState<null | HTMLElement>(null);
  const [refundExpanded, setRefundExpanded] = useState(false);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const location = useLocation();
  const navigate = useNavigate();

  const openTerms = () => setTermsOpen(true);
  const closeTerms = () => setTermsOpen(false);
  const acceptTerms = () => { setTermsOpen(false); navigate('/book'); };

  const isActive = (path: string) => location.pathname === path;
  const isRefundActive = location.pathname === '/cancel-booking' || location.pathname === '/refunds' || location.pathname === '/track-refund';

  useEffect(() => {
    setRefundAnchorEl(null);
  }, [location.pathname]);

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ displayPrint: 'none' }}>
        <Container maxWidth="xl">
          <Toolbar sx={{ py: { xs: 0.75, sm: 1 }, px: { xs: 0, sm: 1 }, gap: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
            {/* Logo */}
            <Box
              component={Link}
              to="/"
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', flexGrow: { xs: 1, md: 0 } }}
            >
              <AccountBalanceIcon sx={{ fontSize: 36, color: '#d68db8' }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.1, fontSize: { xs: '0.84rem', sm: '1rem' } }}>
                  Hutatma Smruti Mandir
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem' }}>
                  Venue Booking System
                </Typography>
              </Box>
            </Box>

            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto', alignItems: 'center' }}>
                  {publicNavItems.map((item) => item.children ? (
                    <React.Fragment key={item.label}>
                      <Button
                        onClick={(event) => setRefundAnchorEl(event.currentTarget)}
                        endIcon={<ExpandMore />}
                        aria-haspopup="menu"
                        aria-expanded={Boolean(refundAnchorEl)}
                        sx={{
                          color: isRefundActive ? '#f0c7df' : 'rgba(255,255,255,0.9)',
                          fontWeight: isRefundActive ? 700 : 500,
                          fontSize: '0.85rem',
                          px: 1.25,
                          borderBottom: isRefundActive ? '2px solid #f0c7df' : '2px solid transparent',
                          borderRadius: 0,
                          '&:hover': { color: '#f0c7df', backgroundColor: 'rgba(255,255,255,0.05)' },
                        }}
                      >
                        Refund
                      </Button>
                      <Menu
                        anchorEl={refundAnchorEl}
                        open={Boolean(refundAnchorEl)}
                        onClose={() => setRefundAnchorEl(null)}
                      >
                        {item.children.map((child) => (
                          <MenuItem
                            key={child.path}
                            component={Link}
                            to={child.path}
                            selected={isActive(child.path)}
                            onClick={() => setRefundAnchorEl(null)}
                          >
                            {child.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </React.Fragment>
                  ) : (
                    <Button
                      key={item.path}
                      component={Link}
                      to={item.path}
                      sx={{
                        color: isActive(item.path || '') ? '#f0c7df' : 'rgba(255,255,255,0.9)',
                        fontWeight: isActive(item.path || '') ? 700 : 500,
                        fontSize: '0.85rem',
                        px: 1.25,
                        borderBottom: isActive(item.path || '') ? '2px solid #f0c7df' : '2px solid transparent',
                        borderRadius: 0,
                        '&:hover': { color: '#f0c7df', backgroundColor: 'rgba(255,255,255,0.05)' },
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, ml: isMobile ? 'auto' : 1, alignItems: 'center' }}>
              {!isMobile && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={openTerms}
                  sx={{ ml: 2, py: 0.8 }}
                >
                  Book Now
                </Button>
              )}
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate('/admin/login')}
                size={isMobile ? 'small' : 'medium'}
                sx={{ py: 0.8, whiteSpace: 'nowrap' }}
              >
                {isMobile ? 'Staff Login' : 'Login'}
              </Button>

            {/* Mobile hamburger */}
            {isMobile && (
              <IconButton color="inherit" onClick={() => setDrawerOpen(true)} edge="end">
                <MenuIcon />
              </IconButton>
            )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 'min(320px, calc(100vw - 24px))' } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)' }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Menu</Typography>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {publicNavItems.map((item) => item.children ? (
            <React.Fragment key={item.label}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => setRefundExpanded((expanded) => !expanded)}
                  selected={isRefundActive}
                  aria-expanded={refundExpanded || isRefundActive}
                  sx={{
                    '&.Mui-selected': { bgcolor: 'rgba(180,84,144,0.12)', color: '#50175d' },
                    '&.Mui-selected .MuiListItemText-primary': { fontWeight: 700 },
                  }}
                >
                  <ListItemText primary="Refund" />
                  {refundExpanded || isRefundActive ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={refundExpanded || isRefundActive} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItem key={child.path} disablePadding>
                      <ListItemButton
                        component={Link}
                        to={child.path}
                        onClick={() => setDrawerOpen(false)}
                        selected={isActive(child.path)}
                        sx={{
                          pl: 4,
                          '&.Mui-selected': { bgcolor: 'rgba(180,84,144,0.12)', color: '#50175d' },
                          '&.Mui-selected .MuiListItemText-primary': { fontWeight: 700 },
                        }}
                      >
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          ) : (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                selected={isActive(item.path || '')}
                sx={{
                  '&.Mui-selected': { bgcolor: 'rgba(180,84,144,0.12)', color: '#50175d' },
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
        </List>
      </Drawer>
      <Dialog open={termsOpen} onClose={closeTerms} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)', color: '#fff' }}>नियम व अटी</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2, color: '#50175d', fontWeight: 700 }}>
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
