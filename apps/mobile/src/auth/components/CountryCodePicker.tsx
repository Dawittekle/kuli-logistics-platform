import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CountryCode, countryCodes, filterCountries } from '../data/country-codes';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface CountryCodePickerProps {
  visible: boolean;
  selectedCode: CountryCode;
  onSelect: (country: CountryCode) => void;
  onClose: () => void;
  colors?: typeof authLightColors;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  visible,
  selectedCode,
  onSelect,
  onClose,
  colors = authLightColors
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filtered = filterCountries(searchQuery);

  const handleSelect = (country: CountryCode) => {
    onSelect(country);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Select Country Code
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close country code picker"
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search country name or code (+251, Ethiopia)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Country List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.isoCode}-${item.dialCode}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.dialCode === selectedCode.dialCode && item.isoCode === selectedCode.isoCode;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, dial code ${item.dialCode}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelect(item)}
                  style={[
                    styles.countryItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.orangeSubtle }
                  ]}
                >
                  <Text style={styles.flagText}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.dialCode, { color: colors.primary }]}>
                    {item.dialCode}
                  </Text>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check" size={20} color={colors.orange} />
                  ) : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No countries match "{searchQuery}"
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    height: '75%',
    borderTopLeftRadius: authRadii.card * 1.5,
    borderTopRightRadius: authRadii.card * 1.5,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.md,
    paddingVertical: authSpacing.md,
    borderBottomWidth: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: authSpacing.md,
    paddingHorizontal: authSpacing.md,
    height: 48,
    borderRadius: authRadii.input,
    borderWidth: 1
  },
  searchIcon: {
    marginRight: authSpacing.sm
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%'
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: authSpacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  flagText: {
    fontSize: 24,
    marginRight: authSpacing.md
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  },
  dialCode: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: authSpacing.sm
  },
  emptyContainer: {
    padding: authSpacing.xl,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 15
  }
});
