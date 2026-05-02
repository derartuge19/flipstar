import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';

const GOLD = '#C8B56A';

const Avatar = React.memo(({ uri, size = 36, name = '' }) => {
  const [err, setErr] = useState(false);
  const safeName = name || '?';
  if (uri && !err) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setErr(true)} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#000', fontWeight: '700', fontSize: size * 0.4 }}>{safeName[0].toUpperCase()}</Text>
    </View>
  );
});

export default Avatar;
