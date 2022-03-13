import { reactive } from 'vue';

interface State {
  username: string;
  token: string;
}

export const state = reactive<State>({
  username: localStorage.getItem('username') || '',
  token: localStorage.getItem('token') || '',
});

export async function signup(): Promise<void> {}

export async function login(): Promise<void> {}

export async function logout(): Promise<void> {}

export async function pull(): Promise<void> {}

export async function push(): Promise<void> {}
