import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
          return JSON.parse(storagedCart);
        }

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const productFound = cart.find((item) => item.id === productId);

            if (productFound === undefined) {
                await handleAddNewProduct(productId);
                return;
            }

            await handleUpdateAmountOnExistingProduct(productFound);

        } catch {
            showToastError('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const productFound = cart.find((item) => item.id === productId);
            if (productFound === undefined) {
                showToastError('Erro na remoção do produto');
                return;
            }

            const updatedCart = cart.filter((item) => item.id !== productId);

            setCart(updatedCart);

            persistCartOnLocalStorage(updatedCart);
        } catch {
            showToastError('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            const productFound = cart.find((item) => item.id === productId);

            if (amount <=0 || productFound === undefined || productFound.amount <= 0) {
                showToastError('Erro na alteração de quantidade do produto');
                return;
            }

            const { data: stock }: { data: Stock } = await api.get(`stock/${productId}`);

            if (productFound.amount + amount > stock.amount) {
                showToastError('Quantidade solicitada fora de estoque');
                return;
            }

            const updatedCart = cart.map(
                (item) => item.id === productFound.id ? { ...item, amount: amount }:  { ...item },
            );

            setCart(updatedCart);

            persistCartOnLocalStorage(updatedCart);
        } catch {
            showToastError('Erro na alteração de quantidade do produto');
        }
    };

    const handleAddNewProduct = async (productId: number) => {
        const { data } = await api.get(`products/${productId}`);

        const { data: stock }: { data: Stock } = await api.get(`stock/${data.id}`);

        if (stock.amount === 0) {
            showToastError('Quantidade solicitada fora de estoque');
            return;
        }

        const updatedCart = [
            ...cart,
            {
                ...data,
                amount: 1,
            }
        ]

        setCart(updatedCart);
        persistCartOnLocalStorage(updatedCart);
    };

    const handleUpdateAmountOnExistingProduct = async(productFound: Product) => {
        const { data: stock }: { data: Stock } = await api.get(`stock/${productFound.id}`);
        if (productFound.amount + 1 > stock.amount) {
            showToastError('Quantidade solicitada fora de estoque');

            return;
        }

        const updatedCart = cart.map(
            (item) => item.id === productFound.id ? { ...item, amount: ++item.amount}: item,
        );

        setCart(updatedCart);

        persistCartOnLocalStorage(updatedCart);
    };

    const persistCartOnLocalStorage = (cart: Product[]) => {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    };

    const showToastError = (message: string) => {
        toast.error(message);
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
