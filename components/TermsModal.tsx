import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({ visible, onClose, isDark }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <BlurView 
            intensity={isDark ? 40 : 80} 
            tint={isDark ? "dark" : "light"}
            style={{ flex: 1, marginTop: 80, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ padding: 24, flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: isDark ? '#fff' : '#0f172a' }}>Términos y Condiciones</Text>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 12 }}
                        >
                            <X size={24} color={isDark ? '#fff' : '#0f172a'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 20 }}>
                            Bienvenido a Quantica CRM. Al utilizar nuestra aplicación, aceptas los siguientes términos y condiciones de servicio. Por favor, léelos atentamente.
                        </Text>

                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#0f172a', marginBottom: 12 }}>1. Aceptación del Servicio</Text>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 20 }}>
                            Al registrarte o iniciar sesión en Quantica, aceptas cumplir con todas las políticas de uso y privacidad establecidas para la gestión de tus puntos y beneficios de fidelización.
                        </Text>

                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#0f172a', marginBottom: 12 }}>2. Protección de Datos</Text>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 20 }}>
                            Quantica se compromete a proteger tu información personal. Tu número de teléfono y nombre solo se utilizarán para la identificación y gestión de tu cuenta en el sistema de puntos.
                        </Text>

                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#0f172a', marginBottom: 12 }}>3. Sistema de Puntos</Text>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 20 }}>
                            Los puntos acumulados son personales e intransferibles. Cada establecimiento se reserva el derecho de modificar las reglas de asignación y canje de puntos con previo aviso.
                        </Text>

                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#fff' : '#0f172a', marginBottom: 12 }}>4. Uso Responsable</Text>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 32 }}>
                            Cualquier intento de manipulación del sistema de puntos resultará en la cancelación inmediata de la cuenta del usuario sin derecho a reclamos.
                        </Text>

                        <Text style={{ fontSize: 12, textAlign: 'center', color: '#8b5cf6', fontWeight: 'bold', marginBottom: 40 }}>
                            © 2026 Quantica CRM - Todos los derechos reservados.
                        </Text>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </BlurView>
      </View>
    </Modal>
  );
};
