import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Trophy, Gift, Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

// Arrays de nombres falsos para simular que pasa por muchos usuarios
const DUMMY_NAMES = [
  "María Rodríguez", "Carlos Gómez", "Ana Silva", "Luis Torres", 
  "Elena Martínez", "Jorge Ruiz", "Laura Castro", "Miguel Paz",
  "Sofía Díaz", "Diego Herrera", "Lucía Vargas", "Andrés Soto"
];

export function LiveRaffleModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [raffleData, setRaffleData] = useState<{
    eventName: string;
    prize: string;
    winnerName: string;
  } | null>(null);
  
  const [currentName, setCurrentName] = useState('...');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const winnerScale = useRef(new Animated.Value(0.5)).current;
  const winnerOpacity = useRef(new Animated.Value(0)).current;
  const spinRotation = useRef(new Animated.Value(0)).current;

  // Supabase Realtime Listener
  useEffect(() => {
    console.log("MÓVIL: Escuchando canal marketing_events...");
    const channel = supabase.channel('marketing_events')
      .on(
        'broadcast',
        { event: 'START_RAFFLE' },
        (payload) => {
          console.log('¡SORTEO DETECTADO!', payload);
          handleStartRaffle(payload.payload);
        }
      )
      .subscribe((status) => {
        console.log("Supabase Channel Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStartRaffle = (data: any) => {
    // Reset States
    setRaffleData({
      eventName: data.raffle_name || 'Gran Sorteo',
      prize: data.prize || 'Premio Sorpresa',
      winnerName: data.winner_name || '¡Alguien afortunado!'
    });
    setIsVisible(true);
    setIsSpinning(true);
    setCurrentName('...');
    
    // Reset Anims
    winnerScale.setValue(0.5);
    winnerOpacity.setValue(0);
    spinRotation.setValue(0);

    // Entrada del Modal
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();

    // Iniciar Animación de Ruleta
    Animated.loop(
      Animated.timing(spinRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    // Efecto Ruleta: Cambiar nombres rápido con Haptics
    let speed = 50;
    let iterations = 0;
    const maxIterations = 60; // 3 segundos aprox

    const tick = () => {
      iterations++;
      const randomName = DUMMY_NAMES[Math.floor(Math.random() * DUMMY_NAMES.length)];
      setCurrentName(randomName);
      
      // Vibración de "tic" (ruleta)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      if (iterations < maxIterations) {
        // Reducir velocidad al final para dar suspenso
        if (iterations > 40) speed += 15;
        setTimeout(tick, speed);
      } else {
        // DETENER LA RULETA EN EL GANADOR
        setIsSpinning(false);
        spinRotation.stopAnimation();
        setCurrentName(data.winner_name);
        
        // Efecto Ganador (Vibración fuerte y animación)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        
        Animated.parallel([
          Animated.spring(winnerScale, {
            toValue: 1.1,
            friction: 4,
            tension: 50,
            useNativeDriver: true
          }),
          Animated.timing(winnerOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          })
        ]).start(() => {
          // Bajar escala a 1 suavemente
          Animated.spring(winnerScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
        });
      }
    };

    setTimeout(tick, 500); // Pequeña pausa antes de empezar
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setIsVisible(false);
    });
  };

  if (!isVisible || !raffleData) return null;

  const spinInterpolate = spinRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Modal visible={isVisible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.2)', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            {/* Header del Evento */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', marginBottom: 40 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#fbbf24', fontWeight: '900', letterSpacing: 4, fontSize: 12, textTransform: 'uppercase' }}>
                  🔴 Transmisión en Vivo
                </Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1 }}>
                {raffleData.eventName}
              </Text>
            </Animated.View>

            {/* Círculo de Sorteo */}
            <View style={{ width: width * 0.8, height: width * 0.8, justifyContent: 'center', alignItems: 'center', marginBottom: 40 }}>
              {isSpinning && (
                <Animated.View style={{ 
                  position: 'absolute', 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: width * 0.4, 
                  borderWidth: 4,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  borderTopColor: '#f59e0b',
                  transform: [{ rotate: spinInterpolate }]
                }} />
              )}
              
              <View style={{ 
                width: '85%', 
                height: '85%', 
                backgroundColor: isSpinning ? 'rgba(0,0,0,0.5)' : '#f59e0b', 
                borderRadius: width, 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: 20,
                shadowColor: '#f59e0b',
                shadowOpacity: isSpinning ? 0 : 0.8,
                shadowRadius: 30,
                elevation: 10
              }}>
                <Trophy size={48} color={isSpinning ? '#fbbf24' : '#fff'} style={{ marginBottom: 16, opacity: isSpinning ? 0.5 : 1 }} />
                
                {isSpinning ? (
                  <Text style={{ color: '#fbbf24', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
                    {currentName}
                  </Text>
                ) : (
                  <Animated.View style={{ opacity: winnerOpacity, transform: [{ scale: winnerScale }], alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                      ¡Ganador!
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 32 }}>
                      {currentName}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </View>

            {/* Area del Premio (Solo aparece al ganar) */}
            {!isSpinning && (
              <Animated.View style={{ opacity: winnerOpacity, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 24, borderRadius: 30, width: '100%' }}>
                <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                  Premio
                </Text>
                <Text style={{ color: '#fbbf24', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                  {raffleData.prize}
                </Text>
              </Animated.View>
            )}

            {/* Botón Cerrar (Aparece al final) */}
            {!isSpinning && (
              <Animated.View style={{ opacity: winnerOpacity, position: 'absolute', bottom: 40, width: '100%' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text onPress={handleClose} style={{ color: '#94a3b8', fontSize: 14, fontWeight: 'bold', padding: 20 }}>
                    Tocar para cerrar
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}
