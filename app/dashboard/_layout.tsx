import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { Home, Store, User, Gift, QrCode } from 'lucide-react-native';
import { View, TouchableOpacity, Platform, Dimensions, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { QRModal } from '../../components/QRModal';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  any,
  any
>(Navigator);

function CustomTabBar({ state, descriptors, navigation, onQRPress, isDark }: any) {
    const insets = useSafeAreaInsets();
    const tabBg = isDark ? '#000000' : '#ffffff';

    // We have 4 routes in 'state.routes', but we want 5 buttons.
    // Index mapping: 0:Home, 1:Catalog, 2:QR(Static), 3:Promotions, 4:Profile
    
    const renderTab = (route: any, index: number) => {
        if (!route || !descriptors || !descriptors[route.key]) return null;
        
        const { options } = descriptors[route.key];
        const label = options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
            const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
            }
        };

        const Icon = route.name === 'home' ? Home : 
                     route.name === 'catalog' ? Store : 
                     route.name === 'promotions' ? Gift : User;

        return (
            <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
                <Icon size={22} color={isFocused ? '#8b5cf6' : '#94a3b8'} />
                <Text style={{ 
                    color: isFocused ? '#8b5cf6' : '#94a3b8', 
                    fontSize: 8, 
                    fontWeight: '900', 
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                }}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View 
            style={{ 
                flexDirection: 'row', 
                backgroundColor: tabBg,
                height: 70 + insets.bottom,
                paddingBottom: insets.bottom,
                borderTopWidth: 0.5,
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                elevation: 25,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 15,
            }}
        >
            {state.routes[0] && renderTab(state.routes[0], 0)}
            {state.routes[1] && renderTab(state.routes[1], 1)}
            
            {/* INJECTED QR BUTTON IN THE MIDDLE */}
            <TouchableOpacity
                onPress={onQRPress}
                activeOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
                <View style={{ 
                    backgroundColor: '#8b5cf6', 
                    width: 54, 
                    height: 54, 
                    borderRadius: 20, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginTop: -10, // Slightly elevated but part of the grid
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 8,
                    borderWidth: 3,
                    borderColor: tabBg
                }}>
                    <QrCode color="white" size={24} />
                </View>
            </TouchableOpacity>

            {state.routes[2] && renderTab(state.routes[2], 2)}
            {state.routes[3] && renderTab(state.routes[3], 3)}
        </View>
    );
}

export default function TabLayout() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const [isQRVisible, setIsQRVisible] = useState(false);
    const [userData, setUserData] = useState({ name: '', code: '' });

    useEffect(() => {
        const fetchUser = async (email: string) => {
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('name')
                    .eq('email', email)
                    .single();
                
                if (error) throw error;
                if (data) {
                    setUserData({ 
                        name: data.name || 'Cliente', 
                        code: email.split('@')[0].toUpperCase() || 'GUEST'
                    });
                }
            } catch (err) {
                console.error('Error fetching layout user:', err);
                // Fallback for names if DB fetch fails but we have session
                setUserData(prev => ({ ...prev, name: prev.name || 'Invitado' }));
            }
        };

        // Try initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) fetchUser(session.user.email);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.email) fetchUser(session.user.email);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <MaterialTabs
                key={isDark ? 'dark-tabs' : 'light-tabs'}
                tabBarPosition="bottom"
                tabBar={(props) => (
                    <CustomTabBar 
                        {...props} 
                        onQRPress={() => setIsQRVisible(true)} 
                        isDark={isDark} 
                    />
                )}
                screenOptions={{
                    tabBarIndicatorStyle: { height: 0 },
                    swipeEnabled: true,
                    tabBarShowIcon: true,
                }}
            >
                <MaterialTabs.Screen
                    name="home"
                    options={{ title: 'Inicio' }}
                />
                <MaterialTabs.Screen
                    name="catalog"
                    options={{ title: 'Premios' }}
                />
                <MaterialTabs.Screen
                    name="promotions"
                    options={{ title: 'Ofertas' }}
                />
                <MaterialTabs.Screen
                    name="profile"
                    options={{ title: 'Perfil' }}
                />
            </MaterialTabs>

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
