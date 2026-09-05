// AsyncStorage hat kein natives Modul im Test-Prozess — der mitgelieferte Mock
// bildet die Schnittstelle im Arbeitsspeicher nach, sodass `backend.web.ts`
// echt getestet werden kann statt nur gemockt.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Storage/batch unit tests own their input records. A content update must not
// silently add shipped records to those fixtures. Bundle tests supply an
// explicit catalog; delivered.test.ts opts into the actual release catalog.
jest.mock('./src/content/catalog.json', () => ({ version: 1, entries: [] }));
