import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { withLayoutContext, Stack, Tabs, useRouter } from 'expo-router';
import { Home, Store, User, Gift, QrCode } from 'lucide-react-native';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { QRModal } from '../../components/QRModal';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from 'nativewind';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  any,
  any
>(Navigator);

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const [isQRVisible, setIsQRVisible] = useState(false);
    const [userData, setUserData] = useState({ name: '', code: '' });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data } = await supabase
                    .from('customers')
                    .select('name, referral_code')
                    .eq('email', session.user.email)
                    .single();
                if (data) {
                    setUserData({ 
                        name: data.name, 
                        code: data.referral_code || 'GUEST'
                    });
                }
            }
        };

        fetchUser();
    }, []);

    return (
        <View className="flex-1 bg-white dark:bg-black">
            <MaterialTabs
                tabBarPosition="bottom"
                screenOptions={{
                    tabBarActiveTintColor: '#8b5cf6',
                    tabBarInactiveTintColor: '#94a3b8',
                    tabBarIndicatorStyle: {
                        backgroundColor: '#8b5cf6',
                        height: 3,
                        top: 0,
                        width: '15%',
                        left: '5%',
                        borderRadius: 10,
                    },
                    tabBarStyle: {
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                        height: (Platform.OS === 'ios' ? 65 : 65) + insets.bottom,
                        paddingBottom: insets.bottom,
                        borderTopWidth: 0,
                        elevation: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 15,
                    },
                    tabBarLabelStyle: {
                        fontSize: 9,
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 8,
                    },
                    tabBarShowIcon: true,
                    tabBarPressColor: 'transparent',
                    swipeEnabled: true,
                }}
            >
                <MaterialTabs.Screen
                    name="home"
                    options={{
                        title: 'Inicio',
                        tabBarIcon: ({ color }: { color: string }) => <Home size={22} color={color} />,
                    }}
                />
                <MaterialTabs.Screen
                    name="catalog"
                    options={{
                        title: 'Premios',
                        tabBarIcon: ({ color }: { color: string }) => <Store size={22} color={color} />,
                    }}
                />
                <MaterialTabs.Screen
                    name="promotions"
                    options={{
                        title: 'Ofertas',
                        tabBarIcon: ({ color }: { color: string }) => <Gift size={22} color={color} />,
                    }}
                />
                <MaterialTabs.Screen
                    name="profile"
                    options={{
                        title: 'Perfil',
                        tabBarIcon: ({ color }: { color: string }) => <User size={22} color={color} />,
                    }}
                />
            </MaterialTabs>

            {/* Custom Center Floating Button */}
            <View 
                style={{ 
                    position: 'absolute', 
                    bottom: insets.bottom + 15, 
                    alignSelf: 'center',
                    zIndex: 100 
                }}
            >
                <TouchableOpacity 
                    onPress={() => setIsQRVisible(true)}
                    activeOpacity={0.8}
                    className="bg-primary p-4 rounded-3xl shadow-2xl shadow-primary/60 border-4 border-white dark:border-zinc-900"
                    style={{ elevation: 15 }}
                >
                    <QrCode color="white" size={28} />
                </TouchableOpacity>
            </View>

            <QRModal 
                visible={isQRVisible}
                onClose={() => setIsQRVisible(false)}
                qrValue={userData.code}
                userName={userData.name}
                isDark={isDark}
            />
        </View>
    );
}
