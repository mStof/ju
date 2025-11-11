import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

export default function ChatScreen({ route, navigation }) {
  const { contato } = route.params;
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: `Chat com @${contato.username}`
    });
  }, [contato]);

  useEffect(() => {
    if (!auth.currentUser || !contato) return;

    const participantes = [auth.currentUser.uid, contato.contatoId].sort();
    const conversaId = participantes.join('_');

    console.log('Buscando mensagens para conversa:', conversaId);
    console.log('Usuário atual:', auth.currentUser.uid);
    console.log('Contato:', contato.contatoId);

    const q = query(
      collection(db, 'mensagens'),
      where('conversaId', '==', conversaId)
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const mensagensArray = [];
        querySnapshot.forEach((doc) => {
          const mensagemData = doc.data();
          mensagensArray.push({
            id: doc.id,
            ...mensagemData
          });
        });
        
        mensagensArray.sort((a, b) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
          return timeA - timeB;
        });
        
        setMensagens(mensagensArray);
        
        setTimeout(() => {
          if (flatListRef.current && mensagensArray.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      },
      (error) => {
        console.log('Erro ao buscar mensagens:', error);
        Alert.alert('Erro', 'Não foi possível carregar as mensagens');
      }
    );

    return unsubscribe;
  }, [contato]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim()) {
      Alert.alert('Atenção', 'Digite uma mensagem!');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Erro', 'Usuário não autenticado!');
      return;
    }

    setEnviando(true);

    try {
      const participantes = [auth.currentUser.uid, contato.contatoId].sort();
      const conversaId = participantes.join('_');

      console.log('Enviando mensagem para conversa:', conversaId);

      await addDoc(collection(db, 'mensagens'), {
        texto: novaMensagem.trim(),
        remetenteId: auth.currentUser.uid,
        remetenteEmail: auth.currentUser.email,
        remetenteUsername: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        destinatarioId: contato.contatoId,
        destinatarioUsername: contato.username,
        destinatarioEmail: contato.email,
        conversaId: conversaId,
        timestamp: serverTimestamp(),
        lida: false,
        tipo: 'texto'
      });

      setNovaMensagem('');
    } catch (error) {
      console.log('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    }

    setEnviando(false);
  };

  const renderMensagem = ({ item }) => {
    const ehMinhaMensagem = item.remetenteId === auth.currentUser.uid;

    return (
      <View style={[
        styles.mensagemContainer,
        ehMinhaMensagem ? styles.minhaMensagem : styles.mensagemContato
      ]}>
        <View style={[
          styles.mensagemBubble,
          ehMinhaMensagem ? styles.minhaMensagemBubble : styles.mensagemContatoBubble
        ]}>
          <Text style={[
            styles.mensagemTexto,
            ehMinhaMensagem ? styles.minhaMensagemTexto : styles.mensagemContatoTexto
          ]}>
            {item.texto}
          </Text>
          <Text style={[
            styles.mensagemHora,
            ehMinhaMensagem ? styles.minhaMensagemHora : styles.mensagemContatoHora
          ]}>
            {item.timestamp?.toDate?.() 
              ? new Date(item.timestamp.toDate()).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : 'Agora'
            }
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {/* Header do Chat - MAIOR */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.botaoVoltarContainer}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.botaoVoltar}>← Voltar</Text>
          </TouchableOpacity>
          <View style={styles.contatoInfo}>
            <Text style={styles.nomeContato}>@{contato.username}</Text>
            <Text style={styles.statusContato}>
              {mensagens.length > 0 ? 'Online' : 'Inicie uma conversa'}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Lista de Mensagens - ÁREA MAIOR */}
        <FlatList
          ref={flatListRef}
          data={mensagens}
          renderItem={renderMensagem}
          keyExtractor={item => item.id}
          style={styles.listaMensagens}
          contentContainerStyle={styles.listaMensagensContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.listaVazia}>
              <Text style={styles.listaVaziaIcon}>💬</Text>
              <Text style={styles.listaVaziaTitulo}>Nenhuma mensagem ainda</Text>
              <Text style={styles.listaVaziaTexto}>
                Envie a primeira mensagem para @{contato.username}!
              </Text>
            </View>
          }
        />

        {/* Input de Mensagem - MAIOR */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={`Enviar mensagem para @${contato.username}...`}
            placeholderTextColor="#999"
            value={novaMensagem}
            onChangeText={setNovaMensagem}
            multiline
            maxLength={1000}
            editable={!enviando}
          />
          <TouchableOpacity 
            style={[
              styles.botaoEnviar,
              (!novaMensagem.trim() || enviando) && styles.botaoEnviarDesabilitado
            ]}
            onPress={enviarMensagem}
            disabled={!novaMensagem.trim() || enviando}
          >
            <Text style={styles.botaoEnviarTexto}>
              {enviando ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 20, 
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 80, 
  },
  botaoVoltarContainer: {
    minWidth: 80,
  },
  botaoVoltar: {
    color: '#007AFF',
    fontSize: 18, 
    fontWeight: '600',
  },
  contatoInfo: {
    flex: 1,
    alignItems: 'center',
  },
  nomeContato: {
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusContato: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  placeholder: {
    width: 80,
  },
  listaMensagens: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listaMensagensContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  mensagemContainer: {
    marginBottom: 20, 
    flexDirection: 'row',
  },
  minhaMensagem: {
    justifyContent: 'flex-end',
  },
  mensagemContato: {
    justifyContent: 'flex-start',
  },
  mensagemBubble: {
    maxWidth: '85%', 
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  minhaMensagemBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 8,
  },
  mensagemContatoBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mensagemTexto: {
    fontSize: 18, 
    lineHeight: 24,
    fontWeight: '400',
  },
  minhaMensagemTexto: {
    color: 'white',
  },
  mensagemContatoTexto: {
    color: '#1a1a1a',
  },
  mensagemHora: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.8,
  },
  minhaMensagemHora: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  mensagemContatoHora: {
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'left',
  },
  listaVazia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  listaVaziaIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.3,
  },
  listaVaziaTitulo: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  listaVaziaTexto: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 20, 
    backgroundColor: 'white',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    minHeight: 90, 
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 30, 
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 16,
    marginRight: 16,
    fontSize: 18, 
    maxHeight: 120,
    fontWeight: '400',
  },
  botaoEnviar: {
    backgroundColor: '#007AFF',
    width: 56, 
    height: 56, 
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  botaoEnviarDesabilitado: {
    backgroundColor: '#bdc3c7',
    shadowColor: '#bdc3c7',
  },
  botaoEnviarTexto: {
    color: 'white',
    fontSize: 22, 
    fontWeight: 'bold',
  },
});