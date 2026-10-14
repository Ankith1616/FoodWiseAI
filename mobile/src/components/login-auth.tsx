import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Brand, Surface, TextColors, Radius, Spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import api from '@/services/api';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LoginAuth({ onSuccess, onCancel }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setToken, setUser } = useAppStore();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !fullName)) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        setToken(res.data.access_token);
        setUser(res.data.user);
        onSuccess();
      } else {
        const res = await api.post('/auth/register', { email, password, full_name: fullName });
        setToken(res.data.access_token);
        setUser(res.data.user);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Pressable onPress={onCancel} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          {isLogin ? 'Log in to retrieve your taste profile.' : 'Sign up to build your taste profile.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!isLogin && (
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Alex Walker"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        )}

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="alex@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <Pressable onPress={() => { setIsLogin(!isLogin); setError(''); }}>
            <Text style={styles.toggleText}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: Spacing.four,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Surface.white,
    borderRadius: Radius.lg,
    padding: Spacing.five,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: TextColors.heading,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  closeText: {
    fontSize: 20,
    color: TextColors.muted,
  },
  subtitle: {
    fontSize: 14,
    color: TextColors.muted,
    marginBottom: Spacing.four,
  },
  error: {
    color: '#E74C3C',
    fontSize: 13,
    marginBottom: Spacing.three,
    backgroundColor: '#FDEDEC',
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
  inputWrap: {
    marginBottom: Spacing.three,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: TextColors.heading,
    marginBottom: Spacing.one,
  },
  input: {
    backgroundColor: Surface.bg,
    borderWidth: 1,
    borderColor: Surface.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 14,
    color: TextColors.body,
  },
  submitBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  footerText: {
    fontSize: 13,
    color: TextColors.muted,
  },
  toggleText: {
    fontSize: 13,
    color: Brand.primary,
    fontWeight: '700',
  },
});
