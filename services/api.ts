
import { VehicleData } from "../types";

const API_URL = '/api/consult';

export const consultPlate = async (plate: string): Promise<VehicleData> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ plate }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Erro na comunicação com o servidor');
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Erro na consulta real:", error);
        throw error;
    }
};
