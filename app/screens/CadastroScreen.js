import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';

export default function CadastroScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [username, setUsername] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleCadastro = async () => {
    if (!email || !senha || !confirmarSenha || !username) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem!');
      return;
    }

    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres!');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Erro', 'O username deve ter pelo menos 3 caracteres!');
      return;
    }

    setCarregando(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        username: username.toLowerCase(),
        criadoEm: new Date().toISOString()
      });

      Alert.alert('Sucesso!', 'Conta criada com sucesso!');
    } catch (error) {
      console.log('Erro completo:', error);
      let mensagem = 'Erro ao criar conta. Tente novamente.';
      
      if (error.code === 'auth/email-already-in-use') {
        mensagem = 'Este email já está em uso!';
      } else if (error.code === 'auth/invalid-email') {
        mensagem = 'Email inválido!';
      } else if (error.code === 'auth/weak-password') {
        mensagem = 'Senha muito fraca!';
      }
      
      Alert.alert('Erro', mensagem);
    }
    setCarregando(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.titulo}>Criar Conta</Text>
        <Text style={styles.subtitulo}>Preencha os dados abaixo</Text>

        <TextInput
          style={styles.input}
          placeholder="Seu email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!carregando}
        />

        <TextInput
          style={styles.input}
          placeholder="Seu username (único)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!carregando}
        />

        <TextInput
          style={styles.input}
          placeholder="Sua senha (mín. 6 caracteres)"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          editable={!carregando}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
          editable={!carregando}
        />

        <TouchableOpacity 
          style={[
            styles.botao,
            carregando && styles.botaoDesabilitado
          ]}
          onPress={handleCadastro}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.botaoTexto}>Criar Conta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.link}
          onPress={() => navigation.navigate('Login')}
          disabled={carregando}
        >
          <Text style={styles.linkTexto}>
            Já tem conta? <Text style={styles.linkDestaque}>Faça login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitulo: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  botao: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoDesabilitado: {
    backgroundColor: '#bdc3c7',
  },
  botaoTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkTexto: {
    color: '#666',
    fontSize: 14,
  },
  linkDestaque: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});