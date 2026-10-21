import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName, focused: IconName) =>
  ({ color, focused: f, size }: { color: string; focused: boolean; size: number }) =>
    <Ionicons name={f ? focused : name} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.tanzanite, fontWeight: '600', letterSpacing: 1 },
      headerShadowVisible: false,
      tabBarActiveTintColor: colors.gold,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      tabBarLabelStyle: { fontWeight: '600', letterSpacing: 0.5 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: icon('sparkles-outline', 'sparkles') }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: icon('bag-outline', 'bag') }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: icon('cube-outline', 'cube') }} />
      <Tabs.Screen name="profile" options={{ title: 'Account', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
