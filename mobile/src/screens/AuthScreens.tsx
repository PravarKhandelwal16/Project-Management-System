import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { loginSchema, registerSchema } from "../shared";
import { Brand } from "../components/Brand";
import {
  Page,
  Txt,
  Header,
  Field,
  Button,
  ErrorBox,
  styles,
} from "../components/UI";
import { colors as c, fonts } from "../theme";
export function AuthScreen({ navigation, route }: any) {
  const registration = route.name === "Register";
  const auth = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  const submit = async () => {
    const parsed = (registration ? registerSchema : loginSchema).safeParse(
      registration ? form : { email: form.email, password: form.password },
    );
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      return;
    }
    setErrors({});
    setError("");
    setBusy(true);
    try {
      if (registration) await auth.register(parsed.data as any);
      else await auth.login(parsed.data.email, parsed.data.password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const field = (key: keyof typeof form) => (value: string) =>
    setForm({ ...form, [key]: value });
  return (
    <SafeAreaView style={styles.page}>
      <Page form>
        <View style={[styles.row, { marginTop: 24, marginBottom: 42 }]}>
          <Brand />
          <Txt heading>ProjectMaster</Txt>
        </View>
        <Txt
          style={{
            color: c.blue,
            fontFamily: fonts.bold,
            letterSpacing: 2,
            fontSize: 11,
          }}
        >
          YOUR WORK, IN SYNC
        </Txt>
        <Header
          title={registration ? "Create your account" : "Welcome back."}
          subtitle={
            registration
              ? "Join your team and move work forward."
              : "Your team. Your projects. Wherever you are."
          }
        />
        {auth.notice && <ErrorBox message={auth.notice} />}
        {error && <ErrorBox message={error} />}
        {registration && (
          <Field
            label="Full name"
            value={form.full_name}
            onChangeText={field("full_name")}
            error={errors.full_name}
            autoComplete="name"
          />
        )}
        <Field
          label="Email address"
          value={form.email}
          onChangeText={field("email")}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={field("password")}
          error={errors.password}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={registration ? "new-password" : "current-password"}
          onSubmitEditing={submit}
        />
        <Button
          title={visible ? "Hide password" : "Show password"}
          icon={visible ? EyeOff : Eye}
          variant="secondary"
          onPress={() => setVisible(!visible)}
        />
        {registration && (
          <Txt muted>
            Use at least 8 characters with a letter and a number. Registration
            creates a Team Member account.
          </Txt>
        )}
        <Button
          title={registration ? "Create account" : "Sign in"}
          icon={ArrowRight}
          busy={busy}
          onPress={submit}
        />
        <Button
          title={
            registration
              ? "Already have an account? Sign in"
              : "New here? Create an account"
          }
          variant="secondary"
          onPress={() =>
            navigation.navigate(registration ? "Login" : "Register")
          }
        />
        <Txt muted style={{ textAlign: "center", marginTop: 20 }}>
          The same account and workspace as ProjectMaster on the web.
        </Txt>
      </Page>
    </SafeAreaView>
  );
}
