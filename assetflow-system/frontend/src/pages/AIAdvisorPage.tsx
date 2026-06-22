import React, { useState, useRef, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, TextField, Button, Avatar,
  CircularProgress, Chip, Divider, IconButton, Select, MenuItem, FormControl, InputLabel
} from '@mui/material'
import { SmartToy, Person, Send, AutoAwesome, Refresh } from '@mui/icons-material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { aiApi } from '../api/assetflowApi'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }

const QUICK_TOPICS = [
  { label: '💰 Budget Plan', topic: 'How to create a monthly budget?' },
  { label: '📈 SIP Guide', topic: 'Explain SIP and how to start investing' },
  { label: '🏠 Home Loan', topic: 'How does home loan tax saving work?' },
  { label: '💼 Portfolio', topic: 'Suggest investment portfolio allocation' },
  { label: '🎯 Tax Saving', topic: 'How to save tax under Section 80C?' },
  { label: '🛡️ Insurance', topic: 'How much term insurance do I need?' },
]

const REC_TYPES = [
  { value: 'general', label: '🌟 General Advice' },
  { value: 'budget', label: '📊 Budget Plan' },
  { value: 'debt', label: '💳 Debt Strategy' },
  { value: 'tax', label: '🧾 Tax Planning' },
  { value: 'portfolio', label: '📈 Portfolio' },
  { value: 'emergency', label: '🛡️ Emergency Fund' },
]

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '👋 Hello! I\'m **AssetFlow AI**, your personal financial advisor powered by phi3.\n\nI can help you with:\n• 📊 Budget planning and expense reduction\n• 💰 Investment strategies (SIP, MF, stocks, gold)\n• 🧾 Tax optimization (80C, 80D, NPS, HRA)\n• 💳 Debt reduction strategies\n• 🛡️ Emergency fund planning\n• 📈 Wealth building advice\n\nAsk me anything about your finances!',
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [recType, setRecType] = useState('general')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const { data: ollamaStatus } = useQuery({
    queryKey: ['ollama-status'],
    queryFn: () => aiApi.get('/status').then(r => r.data),
    refetchInterval: 30000,
  })

  const chatMut = useMutation({
    mutationFn: (message: string) => aiApi.post('/chat', {
      user_id: 'demo-user',
      message,
      conversation_history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
    }),
    onSuccess: (r) => {
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.response, timestamp: new Date() }])
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I\'m having trouble connecting. Please try again.', timestamp: new Date() }])
    }
  })

  const recMut = useMutation({
    mutationFn: () => aiApi.post('/recommend', {
      user_id: 'demo-user',
      recommendation_type: recType,
      financial_profile: { monthly_income: 85000, monthly_expense: 52000, net_worth: 500000, total_liabilities: 200000, health_score: 65, top_categories: 'Food, Shopping, Bills' },
    }),
    onSuccess: (r) => {
      setMessages(prev => [...prev,
        { role: 'user', content: `Give me ${REC_TYPES.find(t => t.value === recType)?.label} advice`, timestamp: new Date() },
        { role: 'assistant', content: r.data.advice, timestamp: new Date() },
      ])
    }
  })

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input, timestamp: new Date() }])
    chatMut.mutate(input)
    setInput('')
  }

  const sendQuick = (topic: string) => {
    setMessages(prev => [...prev, { role: 'user', content: topic, timestamp: new Date() }])
    chatMut.mutate(topic)
  }

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <Typography key={i} variant="body2" sx={{ lineHeight: 1.8, '& strong': { fontWeight: 700, color: 'primary.light' } }}>
        {line.startsWith('**') ? <strong>{line.replace(/\*\*/g, '')}</strong> :
         line.startsWith('•') ? <Box component="span" sx={{ display: 'flex', gap: 1 }}>• {line.slice(1)}</Box> : line}
      </Typography>
    ))
  }

  return (
    <Box sx={{ height: 'calc(100vh - 96px)', display: 'flex', gap: 3 }}>
      {/* Sidebar */}
      <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* AI Status */}
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: '#EC4899', width: 36, height: 36 }}><SmartToy sx={{ fontSize: 20 }} /></Avatar>
              <Box>
                <Typography fontWeight={700} fontSize="0.875rem">AssetFlow AI</Typography>
                <Typography variant="caption" color="text.secondary">Powered by phi3</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ollamaStatus?.ollama_running ? 'success.main' : 'warning.main' }} />
              <Typography variant="caption" color={ollamaStatus?.ollama_running ? 'success.main' : 'warning.main'} fontWeight={600}>
                {ollamaStatus?.ollama_running ? 'Ollama Online' : 'Using Fallback Mode'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Smart Recommendations */}
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={2}>🤖 Smart Recommendations</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select value={recType} label="Type" onChange={e => setRecType(e.target.value)}>
                {REC_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" fullWidth startIcon={<AutoAwesome />}
              onClick={() => recMut.mutate()} disabled={recMut.isPending} sx={{ mb: 2 }}>
              {recMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Generate Advice'}
            </Button>

            <Divider sx={{ borderColor: 'rgba(99,102,241,0.1)', mb: 2 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1.5}>Quick Questions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {QUICK_TOPICS.map(q => (
                <Button key={q.label} variant="outlined" size="small" fullWidth
                  sx={{ borderRadius: 2, justifyContent: 'flex-start', fontSize: '0.75rem', border: '1px solid rgba(99,102,241,0.2)', '&:hover': { border: '1px solid #6366F1' } }}
                  onClick={() => sendQuick(q.topic)}>
                  {q.label}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Chat Window */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'linear-gradient(135deg, #EC4899, #6366F1)', width: 36, height: 36, background: 'linear-gradient(135deg, #EC4899, #6366F1)' }}>
            <SmartToy sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography fontWeight={700}>AssetFlow AI Advisor</Typography>
            <Typography variant="caption" color="success.main">● Online • Indian Financial Expert</Typography>
          </Box>
          <IconButton sx={{ ml: 'auto' }} onClick={() => setMessages([messages[0]])}>
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar sx={{
                width: 32, height: 32, flexShrink: 0,
                bgcolor: msg.role === 'user' ? '#6366F1' : '#EC4899',
                background: msg.role === 'assistant' ? 'linear-gradient(135deg, #EC4899, #6366F1)' : undefined,
              }}>
                {msg.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
              </Avatar>
              <Box sx={{
                maxWidth: '80%', p: 2, borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                bgcolor: msg.role === 'user' ? 'rgba(99,102,241,0.15)' : 'rgba(12,21,38,0.8)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.3)' : 'rgba(236,72,153,0.2)'}`,
              }}>
                {formatMessage(msg.content)}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>
          ))}
          {chatMut.isPending && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #EC4899, #6366F1)' }}>
                <SmartToy sx={{ fontSize: 18 }} />
              </Avatar>
              <Box sx={{ p: 2, borderRadius: '4px 16px 16px 16px', bgcolor: 'rgba(12,21,38,0.8)', border: '1px solid rgba(236,72,153,0.2)' }}>
                <CircularProgress size={16} sx={{ color: '#EC4899' }} />
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: '1px solid rgba(99,102,241,0.1)', display: 'flex', gap: 1 }}>
          <TextField
            fullWidth size="small" placeholder="Ask about investments, tax, budget, loans..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            multiline maxRows={3}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <Button variant="contained" sx={{ minWidth: 52, borderRadius: 3, px: 0, background: 'linear-gradient(135deg, #EC4899, #6366F1)' }}
            onClick={sendMessage} disabled={chatMut.isPending || !input.trim()}>
            <Send sx={{ fontSize: 18 }} />
          </Button>
        </Box>
      </Card>
    </Box>
  )
}
