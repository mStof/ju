import { signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';

export default function MainScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  const [texto, setTexto] = useState('');
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      console.log('Usuário não autenticado');
      setCarregando(false);
      return;
    }

    console.log('Carregando itens do usuário:', auth.currentUser.uid);
    
    const q = query(
      collection(db, 'itens'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('criadoEm', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const itensArray = [];
        querySnapshot.forEach((doc) => {
          itensArray.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`✅ ${itensArray.length} itens carregados para o usuário ${auth.currentUser.uid}`);
        setItens(itensArray);
        setCarregando(false);
      },
      (error) => {
        console.log('❌ Erro com ordenação, tentando sem ordenar:', error);
        
        const qSemOrdenacao = query(
          collection(db, 'itens'),
          where('userId', '==', auth.currentUser.uid)
        );

        const unsubscribeSemOrdenacao = onSnapshot(qSemOrdenacao, 
          (querySnapshot) => {
            const itensArray = [];
            querySnapshot.forEach((doc) => {
              itensArray.push({
                id: doc.id,
                ...doc.data()
              });
            });
            
            itensArray.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
            
            console.log(`✅ ${itensArray.length} itens carregados (sem ordenação do Firestore)`);
            setItens(itensArray);
            setCarregando(false);
          },
          (errorFallback) => {
            console.log('❌ Erro crítico ao carregar itens:', errorFallback);
            Alert.alert('Erro', 'Não foi possível carregar seus itens');
            setCarregando(false);
          }
        );

        return unsubscribeSemOrdenacao;
      }
    );

    return unsubscribe;
  }, []);

  const adicionarItem = async () => {
    if (texto.trim() === '') {
      Alert.alert('Atenção', 'Digite algo!');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado!');
      return;
    }

    setSalvando(true);

    if (editando) {
      const itemAtual = itens.find(item => item.id === editando);
      if (itemAtual) {
        setItens(itens.map(item => 
          item.id === editando ? { ...item, texto: texto } : item
        ));
      }

      try {
        const itemRef = doc(db, 'itens', editando);
        await updateDoc(itemRef, {
          texto: texto,
          atualizadoEm: new Date().toISOString()
        });
        setEditando(null);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível atualizar o item');
      }
    } else {
      const novoItemTemp = {
        id: 'temp-' + Date.now(),
        texto: texto,
        userId: user.uid,
        userEmail: user.email,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };

      setItens([novoItemTemp, ...itens]);

      try {
        const docRef = await addDoc(collection(db, 'itens'), {
          texto: texto,
          userId: user.uid,
          userEmail: user.email,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        });

        setItens(prevItens => 
          prevItens.map(item => 
            item.id === novoItemTemp.id 
              ? { ...item, id: docRef.id }
              : item
          )
        );
      } catch (error) {
        setItens(prevItens => 
          prevItens.filter(item => item.id !== novoItemTemp.id)
        );
        Alert.alert('Erro', 'Não foi possível adicionar o item');
      }
    }
    
    setTexto('');
    setSalvando(false);
    Keyboard.dismiss();
  };

  const excluirItem = (id) => {
    const itemParaExcluir = itens.find(item => item.id === id);
    
    setItens(itens.filter(item => item.id !== id));

    Alert.alert(
      'Confirmar',
      'Tem certeza que quer excluir?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => {
            if (itemParaExcluir) {
              setItens(prev => [...prev, itemParaExcluir].sort((a, b) => 
                new Date(b.criadoEm) - new Date(a.criadoEm)
              ));
            }
          }
        },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'itens', id));
            } catch (error) {
              if (itemParaExcluir) {
                setItens(prev => [...prev, itemParaExcluir].sort((a, b) => 
                  new Date(b.criadoEm) - new Date(a.criadoEm)
                ));
              }
              Alert.alert('Erro', 'Não foi possível excluir o item');
            }
          }
        }
      ]
    );
  };

  const editarItem = (item) => {
    setTexto(item.texto);
    setEditando(item.id);
  };

  const limparLista = () => {
    if (itens.length === 0) return;

    const itensBackup = [...itens];
    setItens([]);

    Alert.alert(
      'Limpar Lista',
      `Apagar todos os ${itens.length} itens da SUA lista?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => setItens(itensBackup)
        },
        { 
          text: 'Limpar Tudo', 
          style: 'destructive',
          onPress: async () => {
            try {
              const promises = itensBackup.map(item => 
                deleteDoc(doc(db, 'itens', item.id))
              );
              await Promise.all(promises);
            } catch (error) {
              setItens(itensBackup);
              Alert.alert('Erro', 'Não foi possível limpar sua lista');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.log('Erro ao sair:', error);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemConteudo}>
        <Text style={styles.itemTexto}>{item.texto}</Text>
        <Text style={styles.itemData}>
          {new Date(item.criadoEm).toLocaleDateString('pt-BR')} às {' '}
          {new Date(item.criadoEm).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
        {item.id.includes('temp-') && (
          <Text style={styles.salvandoTexto}>🔄 Salvando...</Text>
        )}
      </View>
      <View style={styles.botoes}>
        <TouchableOpacity 
          style={[styles.botao, styles.botaoEditar]}
          onPress={() => editarItem(item)}
          disabled={salvando || item.id.includes('temp-')}
        >
          <Text style={styles.botaoTexto}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.botao, styles.botaoExcluir]}
          onPress={() => excluirItem(item.id)}
          disabled={salvando || item.id.includes('temp-')}
        >
          <Text style={styles.botaoTexto}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (carregando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.carregandoTexto}>Carregando sua lista...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Minha Lista</Text>
        <View style={styles.headerBotoes}>
          <TouchableOpacity 
            style={styles.botaoContatos}
            onPress={() => navigation.navigate('Contatos')}
          >
            <Text style={styles.botaoContatosTexto}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.userInfo}>{auth.currentUser?.email}</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Digite um item..."
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={adicionarItem}
          editable={!salvando}
        />
        <TouchableOpacity 
          style={[
            styles.botaoAdicionar,
            salvando && styles.botaoDesabilitado
          ]}
          onPress={adicionarItem}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.botaoAdicionarTexto}>
              {editando ? '↻' : '+'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.contador}>
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </Text>
        {itens.length > 0 && (
          <TouchableOpacity 
            style={[
              styles.botaoLimpar,
              salvando && styles.botaoDesabilitado
            ]}
            onPress={limparLista}
            disabled={salvando}
          >
            <Text style={styles.botaoLimparTexto}>🧹</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={itens}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.listaVaziaContainer}>
            <Text style={styles.listaVaziaIcon}>📝</Text>
            <Text style={styles.listaVaziaTitulo}>Sua lista está vazia</Text>
            <Text style={styles.listaVaziaTexto}>
              Adicione itens usando o campo acima!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  carregandoTexto: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  botaoContatos: {
    backgroundColor: '#5856D6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoContatosTexto: {
    color: 'white',
    fontSize: 16,
  },
  userInfo: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: '#FF3B30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  botaoAdicionar: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoDesabilitado: {
    backgroundColor: '#bdc3c7',
  },
  botaoAdicionarTexto: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  contador: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  botaoLimpar: {
    backgroundColor: '#8E8E93',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoLimparTexto: {
    color: 'white',
    fontSize: 14,
  },
  lista: {
    flex: 1,
  },
  listaVaziaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  listaVaziaIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  listaVaziaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  listaVaziaTexto: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  item: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemConteudo: {
    flex: 1,
    marginRight: 10,
  },
  itemTexto: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  itemData: {
    fontSize: 11,
    color: '#8E8E93',
  },
  salvandoTexto: {
    fontSize: 10,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  botoes: {
    flexDirection: 'row',
    gap: 6,
  },
  botao: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoEditar: {
    backgroundColor: '#FFA500',
  },
  botaoExcluir: {
    backgroundColor: '#FF3B30',
  },
  botaoTexto: {
    color: 'white',
    fontSize: 12,
  },
});