import { supabase } from '../lib/supabase';
import { ErroServico, executar } from './erros';
import { paraHeroi } from './herois';

// Linha do banco → item do catálogo usado na interface
function paraItem(l) {
  return { id: l.id, nome: l.nome, icone: l.icone, raridade: l.raridade, tipo: l.tipo, preco: l.preco, cura: l.cura };
}

export async function listarCatalogo() {
  const { data } = await executar(
    supabase.from('itens').select('id, nome, icone, raridade, tipo, preco, cura').order('preco'),
    'Não foi possível carregar o catálogo do mercador.'
  );
  return data.map(paraItem);
}

// O RLS só devolve o inventário do próprio herói
export async function listarInventario() {
  const { data } = await executar(
    supabase.from('inventario').select('id, equipado, item:itens(id, nome, icone, raridade, tipo, preco, cura)').order('id'),
    'Não foi possível carregar o inventário.'
  );
  return data.map(l => ({ id: l.id, equipado: l.equipado, item: paraItem(l.item) }));
}

export async function contarInventario() {
  const { count } = await executar(
    supabase.from('inventario').select('id', { count: 'exact', head: true }),
    'Não foi possível carregar o inventário.'
  );
  return count;
}

// O cliente não altera ouro nem inventário direto: tudo passa pelas RPCs
export async function comprarItem(itemId) {
  const { data } = await executar(supabase.rpc('comprar_item', { p_item_id: itemId }), 'Não foi possível comprar o item.');
  return paraHeroi(data);
}

export async function equiparItem(inventarioId) {
  await executar(supabase.rpc('equipar_item', { p_inventario_id: inventarioId }), 'Não foi possível equipar o item.');
}

export async function usarItem(inventarioId) {
  const { data } = await executar(supabase.rpc('usar_item', { p_inventario_id: inventarioId }), 'Não foi possível usar o item.');
  return paraHeroi(data);
}

// Descartar é um DELETE liberado pelo RLS; confere se algo foi apagado
export async function descartarItem(inventarioId) {
  const { data } = await executar(
    supabase.from('inventario').delete().eq('id', inventarioId).select('id'),
    'Não foi possível descartar o item.'
  );
  if (!data.length) throw new ErroServico('Esse item não está mais no seu inventário.');
}
