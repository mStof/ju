import { addDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';

export default function ContatosScreen({ navigation }) {
  const [usuarios, setUsuarios] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'contatos'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const contatosArray = [];
      querySnapshot.forEach((doc) => {
        contatosArray.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setContatos(contatosArray);
      setCarregando(false);
    });

    return unsubscribe;
  }, []);

  const pesquisarUsuarios = async () => {
    if (!pesquisa.trim()) {
      setUsuarios([]);
      return;
    }

    setBuscando(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', pesquisa.toLowerCase()),
        where('username', '<=', pesquisa.toLowerCase() + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const usuariosArray = [];
      
      querySnapshot.forEach((doc) => {
        if (doc.id !== auth.currentUser.uid) {
          usuariosArray.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });

      setUsuarios(usuariosArray);
    } catch (error) {
      console.log('Erro na pesquisa:', error);
      Alert.alert('Info', 'Digite o username exato do usuário');
    }
    setBuscando(false);
  };

  const adicionarContato = async (usuario) => {
    try {
      const jaEhContato = contatos.some(contato => contato.contatoId === usuario.id);
      if (jaEhContato) {
        Alert.alert('Aviso', 'Este usuário já está nos seus contatos!');
        return;
      }

      await addDoc(collection(db, 'contatos'), {
        userId: auth.currentUser.uid,
        contatoId: usuario.id,
        email: usuario.email,
        username: usuario.username,
        adicionadoEm: new Date().toISOString()
      });

      Alert.alert('Sucesso!', `@${usuario.username} adicionado aos contatos!`);
      setPesquisa('');
      setUsuarios([]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o contato');
    }
  };

  // FUNÇÃO PARA ABRIR CHAT
  const abrirChat = (contato) => {
    navigation.navigate('Chat', { contato });
  };

  const renderUsuario = ({ item }) => (
    <View style={styles.usuarioItem}>
      <View style={styles.usuarioInfo}>
        <View style={styles.usuarioAvatar}>
          <Text style={styles.usuarioAvatarTexto}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.usuarioDetalhes}>
          <Text style={styles.usuarioNome}>@{item.username}</Text>
          <Text style={styles.usuarioEmail}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.botaoAdicionar}
        onPress={() => adicionarContato(item)}
      >
        <Text style={styles.botaoAdicionarTexto}>Adicionar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContato = ({ item }) => (
    <TouchableOpacity 
      style={styles.contatoItem}
      onPress={() => abrirChat(item)}
    >
      <View style={styles.contatoAvatar}>
        <Text style={styles.contatoAvatarTexto}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contatoInfo}>
        <Text style={styles.contatoNome}>@{item.username}</Text>
        <Text style={styles.contatoEmail}>{item.email}</Text>
        <Text style={styles.contatoData}>
          Adicionado em {new Date(item.adicionadoEm).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <View style={styles.chatIcon}>
        <Text style={styles.chatIconText}>💬</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titulo}>Contatos</Text>
        <Text style={styles.subtituloHeader}>
          Encontre amigos e converse
        </Text>
      </View>
      
      {/* BARRA DE PESQUISA */}
      <View style={styles.pesquisaContainer}>
        <View style={styles.pesquisaWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Buscar por username..."
            placeholderTextColor="#999"
            value={pesquisa}
            onChangeText={setPesquisa}
            onSubmitEditing={pesquisarUsuarios}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={[
              styles.botaoPesquisar,
              buscando && styles.botaoPesquisarDesabilitado
            ]}
            onPress={pesquisarUsuarios}
            disabled={buscando}
          >
            {buscando ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.botaoPesquisarTexto}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* RESULTADOS DA PESQUISA */}
      {usuarios.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.subtitulo}>Resultados da pesquisa ({usuarios.length})</Text>
          <FlatList
            data={usuarios}
            renderItem={renderUsuario}
            keyExtractor={item => item.id}
            style={styles.listaPequena}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* LISTA DE CONTATOS */}
      <View style={styles.secaoContatos}>
        <View style={styles.secaoHeader}>
          <Text style={styles.subtitulo}>
            Seus contatos ({contatos.length})
          </Text>
          {contatos.length > 0 && (
            <Text style={styles.contatoDica}>
              Toque em um contato para conversar
            </Text>
          )}
        </View>
        
        {carregando ? (
          <View style={styles.carregandoContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.carregandoTexto}>Carregando contatos...</Text>
          </View>
        ) : (
          <FlatList
            data={contatos}
            renderItem={renderContato}
            keyExtractor={item => item.id}
            style={styles.lista}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.listaVaziaContainer}>
                <Text style={styles.listaVaziaIcon}>👥</Text>
                <Text style={styles.listaVaziaTitulo}>Nenhum contato</Text>
                <Text style={styles.listaVaziaTexto}>
                  Busque usuários pelo username acima para adicionar contatos e começar a conversar!
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtituloHeader: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  pesquisaContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pesquisaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  botaoPesquisar: {
    backgroundColor: '#007AFF',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  botaoPesquisarDesabilitado: {
    backgroundColor: '#bdc3c7',
    shadowColor: '#bdc3c7',
  },
  botaoPesquisarTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  secao: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  secaoContatos: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  secaoHeader: {
    marginBottom: 15,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  contatoDica: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  listaPequena: {
    maxHeight: 250,
  },
  lista: {
    flex: 1,
  },
  usuarioItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  usuarioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  usuarioAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usuarioAvatarTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  usuarioDetalhes: {
    flex: 1,
  },
  usuarioNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  usuarioEmail: {
    fontSize: 13,
    color: '#666',
  },
  botaoAdicionar: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  botaoAdicionarTexto: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  contatoItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  contatoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  contatoAvatarTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
  },
  contatoInfo: {
    flex: 1,
  },
  contatoNome: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  contatoEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contatoData: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  chatIcon: {
    padding: 8,
  },
  chatIconText: {
    fontSize: 20,
  },
  carregandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carregandoTexto: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  listaVaziaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  listaVaziaIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  listaVaziaTitulo: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  listaVaziaTexto: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});