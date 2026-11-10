import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FiltrosMateriales from './FiltrosMateriales';

const materias = [
    {
        materia_id: 1,
        nombre: 'Cálculo',
        codigo: 'CAL',
        descripcion: null,
        activo: true,
    },
];

function crearProps() {
    return {
        buscar: '',
        onBuscar: vi.fn(),
        materiaId: '',
        onMateria: vi.fn(),
        materias,
        autorizado: '',
        onAutorizado: vi.fn(),
        hayFiltros: false,
        onLimpiar: vi.fn(),
    };
}

function renderizar(props = crearProps()) {
    render(<FiltrosMateriales {...props} />);

    return props;
}

afterEach(() => {
    cleanup();
});

describe('FiltrosMateriales', () => {
    it('no muestra el filtro Estado y conserva los demás filtros', () => {
        renderizar();

        expect(
            screen.getByRole('searchbox', { name: 'Buscar materiales' }),
        ).toBeTruthy();

        expect(
            screen.getByRole('combobox', { name: 'Materia' }),
        ).toBeTruthy();

        expect(
            screen.getByRole('combobox', {
                name: 'Autorización para IA',
            }),
        ).toBeTruthy();

        expect(
            screen.queryByRole('combobox', {
                name: 'Estado de extracción',
            }),
        ).toBeNull();

        expect(screen.queryByText('Estado del texto')).toBeNull();
        expect(screen.queryByText('Texto extraído')).toBeNull();
        expect(screen.queryByText('Sin texto extraído')).toBeNull();
    });

    it('propaga los cambios de los filtros disponibles', () => {
        const props = renderizar();

        fireEvent.change(
            screen.getByRole('searchbox', {
                name: 'Buscar materiales',
            }),
            { target: { value: 'álgebra' } },
        );

        expect(props.onBuscar).toHaveBeenCalledWith('álgebra');

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Materia' }),
            { target: { value: '1' } },
        );

        expect(props.onMateria).toHaveBeenCalledWith('1');

        fireEvent.change(
            screen.getByRole('combobox', {
                name: 'Autorización para IA',
            }),
            { target: { value: 'true' } },
        );

        expect(props.onAutorizado).toHaveBeenCalledWith('true');
    });

    it('mantiene la acción de limpiar filtros', () => {
        const props = crearProps();
        props.hayFiltros = true;

        render(<FiltrosMateriales {...props} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Limpiar filtros' }),
        );

        expect(props.onLimpiar).toHaveBeenCalledTimes(1);
    });
});
