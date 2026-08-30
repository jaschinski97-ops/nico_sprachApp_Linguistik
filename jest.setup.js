// AsyncStorage hat kein natives Modul im Test-Prozess — der mitgelieferte Mock
// bildet die Schnittstelle im Arbeitsspeicher nach, sodass `backend.web.ts`
// echt getestet werden kann statt nur gemockt.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
