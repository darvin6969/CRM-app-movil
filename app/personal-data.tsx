import { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
    ScrollView, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Save, User, Phone, Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { SuccessOverlay } from '../components/SuccessOverlay';
import { AlertModal } from '../components/AlertModal';

export default function PersonalDataScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [initialPhone, setInitialPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Password Change States
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // OTP Verification States
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [mockCorrectOtp, setMockCorrectOtp] = useState('');
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Premium Alert States
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    const { data, error } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('email', session.user.email)
                        .maybeSingle();
                    
                if (error) throw error;
                    if (data) {
                        setName(data.name || '');
                        setPhone(data.phone || '');
                        setInitialPhone(data.phone || '');
                        setEmail(data.email || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                setAlertConfig({
                    visible: true,
                    title: "Error",
                    message: "No se pudieron cargar tus datos. Verifica tu conexión.",
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleGeneralSave = async () => {
        let phoneUpdatePromise = null;
        let passwordUpdatePromise = null;
        let errors: string[] = [];
        let successMessage = "";

        // 1. Check Phone Change
        if (phone !== initialPhone) {
            const phoneRegex = /^[0-9]{9}$/;
            if (!phone) {
                errors.push("El teléfono no puede estar vacío.");
            } else if (!phoneRegex.test(phone)) {
                errors.push("El teléfono debe tener exactamente 9 dígitos.");
            } else {
                setIsSaving(true);
                startOtpFlow();
                setIsSaving(false);
                return; // Wait for OTP
            }
        }

        // 2. Check Password Change
        if (newPassword || confirmPassword) {
            if (!newPassword || !confirmPassword) {
                errors.push("Para cambiar la contraseña, completa ambos campos.");
            } else if (newPassword.length < 6) {
                errors.push("La nueva contraseña debe tener al menos 6 caracteres.");
            } else if (newPassword !== confirmPassword) {
                errors.push("Las contraseñas no coinciden.");
            } else {
                passwordUpdatePromise = supabase.auth.updateUser({ password: newPassword });
            }
        }

        if (errors.length > 0) {
            setAlertConfig({
                visible: true,
                title: "Atención",
                message: errors.join("\n"),
                type: 'warning'
            });
            return;
        }

        if (!phoneUpdatePromise && !passwordUpdatePromise) {
            setAlertConfig({
                visible: true,
                title: "Sin cambios",
                message: "No has realizado ninguna modificación.",
                type: 'info'
            });
            return;
        }

        setIsSaving(true);
        try {
            // Execute updates
            if (phoneUpdatePromise) {
                const { error: phError } = await phoneUpdatePromise;
                if (phError) throw new Error("Error al actualizar teléfono: " + (phError as any).message);
                setInitialPhone(phone);
                successMessage += "Teléfono actualizado. ";
            }

            if (passwordUpdatePromise) {
                const { error: pwdError } = await passwordUpdatePromise;
                if (pwdError) throw new Error("Error al actualizar contraseña: " + (pwdError as any).message);
                setNewPassword('');
                setConfirmPassword('');
                successMessage += "Contraseña actualizada. ";
            }

            setAlertConfig({
                visible: true,
                title: "¡Éxito!",
                message: successMessage.trim(),
                type: 'success'
            });
        } catch (error: any) {
            console.error('Error in general save:', error);
            setAlertConfig({
                visible: true,
                title: "Error",
                message: error.message || "Ocurrió un error inesperado.",
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otpCode.length < 6) return;

        setIsVerifyingOtp(true);
        try {
            // Simulation of verification (reverted from real SMS)
            if (otpCode === mockCorrectOtp) {
                // Success! Now update the database
                const { error } = await supabase
                    .from('customers')
                    .update({ phone })
                    .eq('email', email);

                if (error) throw error;

                setInitialPhone(phone);
                setShowOtpModal(false);
                setOtpCode('');
                
                setAlertConfig({
                    visible: true,
                    title: "¡Verificado!",
                    message: "Tu número de teléfono ha sido actualizado con éxito.",
                    type: 'success'
                });
            } else {
                setAlertConfig({
                    visible: true,
                    title: "Código Incorrecto",
                    message: "El código ingresado no es válido. Inténtalo de nuevo.",
                    type: 'error'
                });
            }
        } catch (error: any) {
            console.error('Error verifying OTP:', error);
            setAlertConfig({
                visible: true,
                title: "Error",
                message: "No se pudo verificar el código: " + error.message,
                type: 'error'
            });
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const startOtpFlow = () => {
        // Generate a random 6-digit code for simulation
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setMockCorrectOtp(code);
        setShowOtpModal(true);
        setCountdown(60);
        
        // Show simulated "SMS Sent" alert with the code
        setAlertConfig({
            visible: true,
            title: "Código Enviado (Simulación)",
            message: `Para completar el cambio al ${phone}, usa el código: ${code}`,
            type: 'info'
        });
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color={isDark ? "#a78bfa" : "#8b5cf6"} />
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    className="flex-1"
                >
                    <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View className="flex-row items-center mb-10">
                            <TouchableOpacity 
                                onPress={() => router.back()} 
                                className="mr-4 bg-white/20 dark:bg-black/20 p-3 rounded-2xl border border-white/20"
                            >
                                <ChevronLeft color={isDark ? "white" : "black"} size={24} />
                            </TouchableOpacity>
                            <View>
                                <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Editar Datos</Text>
                                <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">Mis Datos Personales</Text>
                            </View>
                        </View>

                        <BlurView 
                            intensity={isDark ? 30 : 60} 
                            tint={isDark ? "dark" : "light"} 
                            className="rounded-[32px] p-8 overflow-hidden border border-white/20 dark:border-white/10 shadow-xl"
                        >
                            <View className="gap-y-6">
                                {/* Email (Read-only) */}
                                <View>
                                    <View className="flex-row items-center mb-2 ml-1">
                                        <Mail size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                        <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-2">Email</Text>
                                    </View>
                                    <View className="bg-slate-100/30 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-2xl px-5 h-16 justify-center opacity-70">
                                        <Text className="text-slate-600 dark:text-slate-400 font-bold text-base">{email}</Text>
                                    </View>
                                </View>

                                {/* Name (Now Read-only) */}
                                <View>
                                    <View className="flex-row items-center mb-2 ml-1">
                                        <User size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                        <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-2">Nombre Completo</Text>
                                    </View>
                                    <View className="bg-slate-100/30 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-2xl px-5 h-16 justify-center opacity-70">
                                        <Text className="text-slate-600 dark:text-slate-400 font-bold text-base">{name}</Text>
                                    </View>
                                </View>

                                {/* Phone (Editable) */}
                                <View>
                                    <View className="flex-row items-center mb-2 ml-1">
                                        <Phone size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                        <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-2">Teléfono</Text>
                                    </View>
                                    <TextInput
                                        className="bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 h-16 text-slate-900 dark:text-white text-base font-bold"
                                        placeholder="Teléfono (9 dígitos)"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                        value={phone}
                                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                                        keyboardType="number-pad"
                                        maxLength={9}
                                    />
                                </View>

                                {/* New Password */}
                                <View>
                                    <View className="flex-row items-center mb-2 ml-1">
                                        <Lock size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                        <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-2">Nueva Contraseña</Text>
                                    </View>
                                    <View className="flex-row items-center bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 h-16">
                                        <TextInput
                                            className="flex-1 text-slate-900 dark:text-white text-base font-bold"
                                            placeholder="Mínimo 6 caracteres"
                                            placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                            <Lock size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Password */}
                                <View>
                                    <View className="flex-row items-center mb-2 ml-1">
                                        <Lock size={14} color={isDark ? "#94a3b8" : "#64748b"} />
                                        <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest ml-2">Confirmar Contraseña</Text>
                                    </View>
                                    <View className="flex-row items-center bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 h-16">
                                        <TextInput
                                            className="flex-1 text-slate-900 dark:text-white text-base font-bold"
                                            placeholder="Repite la contraseña"
                                            placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            <Lock size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className="w-full bg-slate-900 dark:bg-white h-16 rounded-2xl flex-row items-center justify-center mt-4 shadow-2xl"
                                    onPress={handleGeneralSave}
                                    disabled={isSaving || isChangingPassword}
                                >
                                    {isSaving || isChangingPassword ? (
                                        <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                                    ) : (
                                        <>
                                            <Save size={20} color={isDark ? "#000" : "#fff"} className="mr-3" />
                                            <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest ml-2">Guardar Cambios</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </BlurView>

                        <View className="mt-10 items-center mb-10">
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center px-8 leading-4">
                                Tu teléfono y contraseña son los únicos datos que pueden ser modificados.
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            <SuccessOverlay 
                visible={showSuccess}
                message="Tus datos han sido actualizados correctamente."
                onClose={() => {
                    setShowSuccess(false);
                    router.back();
                }}
                isDark={isDark}
            />

            {/* OTP Verification Modal */}
            <Modal
                visible={showOtpModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowOtpModal(false)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <BlurView 
                        intensity={40} 
                        tint="dark" 
                        className="w-full bg-slate-900/90 rounded-[40px] p-8 border border-white/10 overflow-hidden shadow-2xl"
                    >
                        <View className="items-center">
                            <View className="w-20 h-20 bg-primary/20 rounded-full items-center justify-center mb-6">
                                <Lock size={32} color="#a78bfa" />
                            </View>
                            
                            <Text className="text-2xl font-black text-white text-center uppercase tracking-tight">Verifica tu número</Text>
                            <Text className="text-slate-400 text-center mt-3 text-sm leading-5">
                                Hemos enviado un código de 6 dígitos al {"\n"}
                                <Text className="text-white font-bold">{phone}</Text>
                            </Text>

                            <View className="w-full mt-10">
                                <TextInput
                                    className="bg-white/10 border border-white/20 rounded-2xl h-20 text-center text-3xl font-black text-white tracking-[15px]"
                                    placeholder="000000"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otpCode}
                                    onChangeText={(text) => {
                                        setOtpCode(text.replace(/[^0-9]/g, ''));
                                    }}
                                    autoFocus
                                />
                            </View>

                            <TouchableOpacity
                                className={`w-full h-16 rounded-2xl flex-row items-center justify-center mt-8 ${otpCode.length === 6 ? 'bg-white' : 'bg-white/50'}`}
                                onPress={handleVerifyOtp}
                                disabled={isVerifyingOtp || otpCode.length < 6}
                            >
                                {isVerifyingOtp ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text className="text-slate-900 font-black text-lg uppercase tracking-widest">Verificar ahora</Text>
                                )}
                            </TouchableOpacity>

                            <View className="mt-8 flex-row items-center">
                                {countdown > 0 ? (
                                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        Reenviar código en {countdown}s
                                    </Text>
                                ) : (
                                    <TouchableOpacity onPress={startOtpFlow}>
                                        <Text className="text-primary font-black text-xs uppercase tracking-widest">Reenviar código</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity 
                                onPress={() => setShowOtpModal(false)}
                                className="mt-6"
                            >
                                <Text className="text-slate-500 font-bold text-xs uppercase tracking-widest">Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>
            </Modal>

            <AlertModal 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                isDark={isDark}
            />
        </View>
    );
}
