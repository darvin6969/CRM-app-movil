import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { AnimatedButton } from '../components/AnimatedButton';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleResetPassword = async () => {
        if (!password || password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setIsSuccess(true);
            setTimeout(() => {
                router.replace('/login');
            }, 3000);
        } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo actualizar la contraseña");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center px-10">
                <CheckCircle2 size={80} color="#22c55e" />
                <Text className="text-white text-3xl font-black mt-6 text-center tracking-tighter">¡Contraseña Actualizada!</Text>
                <Text className="text-slate-400 text-center mt-4 text-lg leading-6">Tu clave ha sido cambiada con éxito. Serás redirigido al inicio de sesión en unos segundos.</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            className="flex-1"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1">
                    <LinearGradient
                        colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                        className="absolute inset-0"
                    />

                    <SafeAreaView className="flex-1 px-6 justify-center">
                        <BlurView 
                            intensity={isDark ? 30 : 60} 
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[48px] py-12 px-8 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden"
                        >
                            <View className="items-center mb-10">
                                <View className="bg-primary/20 p-5 rounded-full mb-6">
                                    <Lock size={40} color="#8b5cf6" />
                                </View>
                                <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-center">Nueva Contraseña</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 font-medium">Escribe tu nueva clave de acceso para asegurar tu cuenta.</Text>
                            </View>

                            <View className="gap-y-5">
                                <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                    <Lock size={18} color={isDark ? "#ffffff" : "#000000"} />
                                    <TextInput
                                        className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                        placeholder="Nueva contraseña"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? (
                                            <EyeOff size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        ) : (
                                            <Eye size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                    <Lock size={18} color={isDark ? "#ffffff" : "#000000"} />
                                    <TextInput
                                        className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                        placeholder="Confirmar contraseña"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                        secureTextEntry={!showPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>

                                <AnimatedButton
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                    className={`w-full ${isLoading ? 'bg-slate-800' : 'bg-slate-900 dark:bg-white'} h-16 rounded-[24px] items-center justify-center mt-4 shadow-xl`}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                                    ) : (
                                        <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest">Cambiar Contraseña</Text>
                                    )}
                                </AnimatedButton>
                            </View>
                        </BlurView>
                    </SafeAreaView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
