import { reactive } from 'vue';

interface State {
  username: string;
  token: string;
}

const state = reactive<State>({
  username: localStorage.getItem('username') || '',
  token: localStorage.getItem('token') || '',
});

async function signup(): Promise<void> {}

async function login(): Promise<void> {}

async function logout(): Promise<void> {}

async function pull(): Promise<void> {}

async function push(): Promise<void> {}

export default { state, signup, login, logout, pull, push };
