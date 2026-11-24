import { tapLight, tapMedium, success } from './haptics';

test('Haptik im Web: wirft nie einen Fehler', () => {
  expect(() => { tapLight(); tapMedium(); success(); }).not.toThrow();
});
