import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, X } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors as c, fonts, tone } from "../theme";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  text: {
    color: c.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  muted: {
    color: c.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21,
  },
  title: {
    color: c.text,
    fontFamily: fonts.bold,
    fontSize: 27,
    lineHeight: 36,
  },
  heading: {
    color: c.text,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 26,
  },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: c.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    minHeight: 48,
  },
});
export function Txt({
  children,
  muted = false,
  heading = false,
  style,
  ...props
}: any) {
  return (
    <Text
      {...props}
      style={[
        muted ? styles.muted : heading ? styles.heading : styles.text,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  icon: Icon,
  variant = "primary",
  busy = false,
  disabled = false,
  style,
}: any) {
  const bg =
    variant === "danger"
      ? "#512330"
      : variant === "primary"
        ? c.primary
        : c.raised;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: bg,
          opacity: disabled || busy ? 0.55 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={c.text} />
      ) : Icon ? (
        <Icon color={c.text} size={18} />
      ) : null}
      <Txt style={{ fontFamily: fonts.bold, textAlign: "center" }}>{title}</Txt>
    </Pressable>
  );
}
export function IconButton({ label, onPress, icon: Icon, badge }: any) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label + (badge ? ", " + badge + " unread" : "")}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: c.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
        borderWidth: 1,
        borderColor: c.border,
      })}
    >
      <Icon size={22} color={c.text} />
      {badge > 0 && (
        <View
          style={{
            position: "absolute",
            right: -4,
            top: -4,
            backgroundColor: c.primary,
            borderRadius: 12,
            minWidth: 20,
            alignItems: "center",
            padding: 2,
          }}
        >
          <Txt style={{ fontSize: 10, lineHeight: 14 }}>
            {badge > 99 ? "99+" : badge}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
export function Card({ children, onPress, label, style }: any) {
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: c.raised },
        style,
      ]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );
}
export function Badge({ value }: { value: string }) {
  const color = tone(value);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 7,
        paddingHorizontal: 9,
        paddingVertical: 4,
        backgroundColor: color + "18",
      }}
    >
      <Txt
        style={{ fontSize: 11, lineHeight: 16, color, fontFamily: fonts.bold }}
      >
        {value}
      </Txt>
    </View>
  );
}
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#244172",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt style={{ color: c.blue, fontFamily: fonts.bold }}>
        {name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </Txt>
    </View>
  );
}
export function Progress({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  return (
    <View accessibilityLabel={value + " percent complete"} style={{ gap: 6 }}>
      <View style={styles.between}>
        <Txt muted>Progress</Txt>
        <Txt muted>{value}%</Txt>
      </View>
      <View
        style={{
          height: 5,
          borderRadius: 4,
          backgroundColor: c.raised,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 5,
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: c.blue,
          }}
        />
      </View>
    </View>
  );
}
export function Page({ children, refresh, refreshing = false }: any) {
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
          refreshControl={
            refresh ? (
              <RefreshControl
                tintColor={c.blue}
                colors={[c.primary]}
                refreshing={refreshing}
                onRefresh={refresh}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Header({ title, subtitle, action }: any) {
  return (
    <View style={styles.between}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Txt muted>{subtitle}</Txt>}
      </View>
      {action}
    </View>
  );
}
export function Section({ title, action }: any) {
  return (
    <View style={styles.between}>
      <Txt heading>{title}</Txt>
      {action}
    </View>
  );
}
export function Empty({
  title = "Nothing here yet",
  detail = "New items will appear here.",
  action,
}: any) {
  return (
    <Card>
      <Txt heading>{title}</Txt>
      <Txt muted>{detail}</Txt>
      {action}
    </Card>
  );
}
export function ErrorBox({ message, retry }: any) {
  return (
    <Card style={{ borderColor: "#743B4E" }}>
      <Txt style={{ color: c.red }} accessibilityRole="alert">
        {message}
      </Txt>
      {retry && (
        <Button title="Try again" variant="secondary" onPress={retry} />
      )}
    </Card>
  );
}
export function Skeleton({ count = 3 }: { count?: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={{ gap: 12 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[styles.card, { height: 110, opacity }]}>
          <View
            style={{
              height: 15,
              width: "65%",
              borderRadius: 6,
              backgroundColor: c.raised,
            }}
          />
          <View
            style={{
              height: 10,
              width: "40%",
              borderRadius: 6,
              backgroundColor: c.raised,
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  error,
  multiline,
  ...props
}: any) {
  const id = label.replace(/\W/g, "");
  return (
    <View style={{ gap: 7 }}>
      <Txt nativeID={id} style={{ fontFamily: fonts.medium }}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={id}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
          error && { borderColor: c.red },
        ]}
        multiline={multiline}
        {...props}
      />
      {error && (
        <Txt accessibilityRole="alert" style={{ color: c.red, fontSize: 12 }}>
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Picker({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: any;
  options: { label: string; value: any }[];
  onChange: (value: any) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Txt>{label}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          label +
          ": " +
          (options.find((o) => o.value === value)?.label || "Select")
        }
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.between, { opacity: disabled ? 0.5 : 1 }]}
      >
        <Txt style={{ flex: 1 }}>
          {options.find((o) => o.value === value)?.label || "Select"}
        </Txt>
        <ChevronDown size={18} color={c.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o, i) => (
          <Button
            key={i}
            title={(value === o.value ? "(selected) " : "") + o.label}
            variant="secondary"
            onPress={() => {
              onChange(o.value);
              setOpen(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}
export function Sheet({ open, onClose, title, children }: any) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#0009",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <SafeAreaView
          style={{
            maxHeight: "85%",
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          edges={["bottom"]}
        >
          <View style={{ padding: 20, gap: 16 }}>
            <View style={styles.between}>
              <Txt heading>{title}</Txt>
              <IconButton icon={X} label="Close" onPress={onClose} />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 12 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export function DateField({ label, value, onChange }: any) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  return (
    <View style={{ gap: 8 }}>
      <Button
        title={label + ": " + (value || "Not set")}
        variant="secondary"
        onPress={() => setOpen(true)}
      />
      {value && (
        <Button
          title={"Clear " + label.toLowerCase()}
          variant="secondary"
          onPress={() => onChange(null)}
        />
      )}
      {open && (
        <DateTimePicker
          value={value ? new Date(value + "T12:00:00") : now}
          mode="date"
          themeVariant="dark"
          onDismiss={() => setOpen(false)}
          onValueChange={(_event, date) => {
            setOpen(Platform.OS === "ios");
            if (date)
              onChange(
                [
                  date.getFullYear(),
                  String(date.getMonth() + 1).padStart(2, "0"),
                  String(date.getDate()).padStart(2, "0"),
                ].join("-"),
              );
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Button title="Done" onPress={() => setOpen(false)} />
      )}
    </View>
  );
}
export function confirm(
  title: string,
  detail: string,
  action: () => Promise<void>,
  onError: (message: string) => void,
) {
  Alert.alert(title, detail, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Confirm",
      style: "destructive",
      onPress: () => {
        void action().catch((error) => onError(error.message));
      },
    },
  ]);
}
export const optionValues = (values: readonly string[], all?: string) => [
  ...(all ? [{ label: all, value: "" }] : []),
  ...values.map((value) => ({ label: value, value })),
];
export const displayDate = (value?: string | null) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not set";
