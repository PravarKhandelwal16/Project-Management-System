jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
}));
// Native picker is covered in the Android/manual checklist, not jsdom.
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");
process.env.EXPO_PUBLIC_API_URL = "http://10.0.2.2:5000/api";
