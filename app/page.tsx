'use client'

import MapContainer from '@/components/MapContainer'
import useKeyStore, { setKey } from '@/domain/key/store'
import { APIProvider } from '@/shells/ProviderShell'
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Stack,
  Button,
} from '@mui/material'
import { useState } from 'react'

const HomePage: React.FC<PageProps<'/'>> = () => {
  const loading = useKeyStore(s => s.loading)
  const apiKey = useKeyStore(s => s.key)

  const [formVersion, setFormVersion] = useState(0)

  const handleKeySubmit = (e: React.SubmitEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const apiKey = formData.get('apiKey') as string
    setKey(apiKey)
    setFormVersion(prev => prev + 1)
  }

  return (
    <Container
      sx={{
        boxSizing: 'border-box',
        height: '100dvh',
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        '& > *': { flexGrow: 0, flexShrink: 0 },
        '& > main': { flexGrow: 1, flexShrink: 1, overflow: 'auto' },
      }}
    >
      <Typography variant='h4' component='h1'>
        Welcome to Dine Pick
      </Typography>
      <Paper
        component='form'
        onSubmit={handleKeySubmit}
        key={formVersion}
        sx={{ py: 2 }}
        elevation={0}
      >
        <Stack direction='row' spacing={2} sx={{ alignItems: 'stretch' }}>
          <TextField
            label='API Key'
            variant='outlined'
            size='small'
            fullWidth
            name='apiKey'
            required
            sx={{ flexShrink: 1, flexGrow: 1 }}
          />
          <Button
            type='submit'
            size='small'
            variant='contained'
            color='primary'
            disableElevation
            sx={{ flexShrink: 0, flexGrow: 0 }}
          >
            Submit
          </Button>
        </Stack>
      </Paper>
      <Box component='main' sx={{ mt: 2, borderRadius: 2, overflow: 'hidden' }}>
        {loading && <Typography>Loading API key...</Typography>}
        {!loading && apiKey && (
          <APIProvider apiKey={apiKey}>
            <MapContainer />
          </APIProvider>
        )}
        {!loading && !apiKey && (
          <Typography variant='caption'>
            Enter your API key to continue.
          </Typography>
        )}
      </Box>
    </Container>
  )
}

export default HomePage
