import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Chip, Paper, Avatar, Fade,
} from '@mui/material';
import {
  EventAvailable, MeetingRoom,
  ArrowForward, CheckCircle, NotificationsActive,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { noticeAPI, venueAPI } from '../../services/api';
import { Venue } from '../../types/types';

// ── Hero Slider ────────────────────────────────────────────────────────────────
const slides = [
  {
    bg: 'linear-gradient(135deg, rgba(15,35,64,0.85) 0%, rgba(26,58,107,0.75) 100%)',
    title: 'Hutatma Smruti Mandir',
    subtitle: 'Book our venue for weddings, meetings and special events',
    cta: 'Book Now',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1600&q=80',
  },
  {
    bg: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(26,58,107,0.6) 100%)',
    title: 'Grand Hall for Every Occasion',
    subtitle: 'Spacious, elegant and fully equipped venue in the heart of the city',
    cta: 'Check Availability',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1600&q=80',
  },
  {
    bg: 'linear-gradient(135deg, rgba(15,35,64,0.9) 0%, rgba(44,94,168,0.7) 100%)',
    title: 'Celebrate Memorable Moments',
    subtitle: 'Professional staff, modern amenities and transparent pricing',
    cta: 'View Gallery',
    image: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1600&q=80',
  },
];

const features = [
  {
    title: 'Instant Availability',
    desc: 'Check open dates and sessions before starting your booking request.',
    icon: <EventAvailable />,
  },
  {
    title: 'Flexible Venue Spaces',
    desc: 'Choose from active venues based on your event size and needs.',
    icon: <MeetingRoom />,
  },
  {
    title: 'Transparent Process',
    desc: 'Review charges clearly, then confirm instantly — no approval wait.',
    icon: <CheckCircle />,
  },
  {
    title: 'Official Updates',
    desc: 'Receive current notices and booking information from the portal.',
    icon: <NotificationsActive />,
  },
];

const amenities = [
  { label: 'Air Conditioning' },
  { label: 'Sound System' },
  { label: 'Stage Area' },
  { label: 'Guest Seating' },
  { label: 'Parking Access' },
  { label: 'Power Backup' },
];

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [notices, setNotices]           = useState<any[]>([]);
  const [venues, setVenues]             = useState<Venue[]>([]);
  const [fade, setFade]                 = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    noticeAPI.getActive().then((r) => setNotices(r.data)).catch(() => {});
    venueAPI.getAll().then((r) => setVenues(r.data)).catch(() => setVenues([]));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentSlide((s) => (s + 1) % slides.length);
        setFade(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];
  const activeVenues = venues.filter((v) => v.status === 'Active');
  const knownCapacities = activeVenues
    .map((v) => v.capacity)
    .filter((capacity): capacity is number => typeof capacity === 'number');
  const totalCapacity = knownCapacities.reduce((sum, capacity) => sum + capacity, 0);
  const facilityNames = Array.from(new Set(activeVenues.flatMap((v) => v.facilities || [])));

  return (
    <Box>
      {/* ── HERO SLIDER ────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: '75vh', md: '88vh' },
          overflow: 'hidden',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Fade in={fade} timeout={500}>
          <Box
            sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              transition: 'all 0.5s ease',
            }}
          />
        </Fade>
        <Box sx={{ position: 'absolute', inset: 0, background: slide.bg }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <Fade in={fade} timeout={600}>
            <Box>
              <Chip
                label="Official Venue Booking Portal"
                sx={{ mb: 2, bgcolor: 'rgba(201,162,39,0.9)', color: '#fff', fontWeight: 600 }}
              />
              <Typography
                variant="h1"
                sx={{ color: '#fff', mb: 2, fontWeight: 800, fontSize: { xs: '2rem', md: '3.5rem' }, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
              >
                {slide.title}
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: 'rgba(255,255,255,0.9)', mb: 4, maxWidth: 600, mx: 'auto', fontWeight: 400 }}
              >
                {slide.subtitle}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained" color="secondary" size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/book')}
                  sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
                >
                  {slide.cta}
                </Button>
                <Button
                  variant="outlined" size="large"
                  onClick={() => navigate('/about')}
                  sx={{ px: 4, py: 1.5, fontSize: '1rem', color: '#fff', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  Learn More
                </Button>
              </Box>
            </Box>
          </Fade>
        </Container>

        {/* Slide indicators */}
        <Box sx={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1 }}>
          {slides.map((_, i) => (
            <Box
              key={i}
              onClick={() => setCurrentSlide(i)}
              sx={{
                width: i === currentSlide ? 28 : 8, height: 8, borderRadius: 4,
                bgcolor: i === currentSlide ? '#c9a227' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ── NOTICES ───────────────────────────────────────────────────────── */}
      {notices.length > 0 && (
        <Box sx={{ bgcolor: '#fff3cd', py: 1.5, borderBottom: '1px solid #ffc107' }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto' }}>
              <NotificationsActive sx={{ color: '#c9a227', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#856404', flexShrink: 0 }}>
                NOTICES:
              </Typography>
              {notices.slice(0, 3).map((n: any) => (
                <Chip
                  key={n.id} label={n.title} size="small"
                  color={n.isImportant ? 'error' : 'default'}
                  sx={{ mr: 1 }}
                />
              ))}
            </Box>
          </Container>
        </Box>
      )}

      {/* ── QUICK STATS ───────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#1a3a6b', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ color: '#c9a227', fontWeight: 800 }}>{activeVenues.length}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>Venues Available</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ color: '#c9a227', fontWeight: 800 }}>
                  {totalCapacity > 0 ? totalCapacity.toLocaleString('en-IN') : '-'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>Total Capacity</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ color: '#c9a227', fontWeight: 800 }}>{facilityNames.length}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>Facilities Listed</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
                <Box textAlign="center">
                <Typography variant="h3" sx={{ color: '#c9a227', fontWeight: 800 }}>API</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>Dynamic Master Data</Typography>
                </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <Box sx={{ py: 8, bgcolor: '#f5f7fa' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="overline" sx={{ color: '#c9a227', fontWeight: 700, letterSpacing: 2 }}>WHY CHOOSE US</Typography>
            <Typography variant="h3" sx={{ color: '#1a3a6b', mt: 1 }}>Why Book with Us</Typography>
            <Typography variant="body1" sx={{ color: '#5a6a7e', mt: 1, maxWidth: 500, mx: 'auto' }}>
              A trusted government institution providing transparent and hassle-free venue booking
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid item xs={12} sm={6} md={3} key={f.title}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <CardContent>
                    <Avatar sx={{ bgcolor: '#1a3a6b', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                      {f.icon}
                    </Avatar>
                    <Typography variant="h6" gutterBottom>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── AMENITIES ─────────────────────────────────────────────────────── */}
      <Box sx={{ py: 6, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="overline" sx={{ color: '#c9a227', fontWeight: 700, letterSpacing: 2 }}>FACILITIES</Typography>
              <Typography variant="h3" sx={{ color: '#1a3a6b', mt: 1, mb: 2 }}>World-Class Amenities</Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Our venue is equipped with modern facilities to make your event a grand success.
                From air-conditioning to high-speed internet, we've got everything covered.
              </Typography>
              <Grid container spacing={2}>
                {amenities.map((a) => (
                  <Grid item xs={6} key={a.label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#2e7d32', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>{a.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Button
                variant="contained" color="primary" sx={{ mt: 3 }}
                onClick={() => navigate('/about')}
                endIcon={<ArrowForward />}
              >
                View All Facilities
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  height: 320, borderRadius: 3, overflow: 'hidden',
                  backgroundImage: 'url(https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80)',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, #1a3a6b 0%, #2d5ea8 100%)', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ color: '#fff', mb: 2, fontWeight: 700 }}>
            Ready to Book Your Event?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, fontWeight: 400 }}>
            Check availability instantly and reserve your date today
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained" color="secondary" size="large"
              onClick={() => navigate('/book')}
              sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
              endIcon={<ArrowForward />}
            >
              Book Now
            </Button>
            <Button
              variant="outlined" size="large"
              onClick={() => navigate('/contact')}
              sx={{ px: 5, py: 1.5, fontSize: '1.1rem', color: '#fff', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff' } }}
            >
              Contact Us
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#0f2340', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="space-between">
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ color: '#c9a227', mb: 1 }}>Hutatma Smruti Mandir</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                A premier venue facility managed under public trust, dedicated to serving the community with excellence and integrity.
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1, fontWeight: 600 }}>Quick Links</Typography>
              {['Home', 'About Venue', 'Gallery', 'Contact Us', 'Book Now'].map((l) => (
                <Typography key={l} variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5, cursor: 'pointer', '&:hover': { color: '#c9a227' } }}>
                  {l}
                </Typography>
              ))}
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1, fontWeight: 600 }}>Contact</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>📍 Hutatma Chowk, Solapur, MH 413001</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>📞 0217-2740308</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>✉ booking@hutatmamandir.org</Typography>
              <Typography
                variant="body2"
                component="a"
                href="https://www.google.com/maps/search/?api=1&query=Hutatma+Chowk,+Solapur,+Maharashtra+413001"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#c9a227', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                🗺 View on Google Maps
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 3, pt: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} Hutatma Smruti Mandir. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
