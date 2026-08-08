document.addEventListener('DOMContentLoaded', () => {
    // ── Variables y Constantes ──
    const apiUrl = 'https://backservicetest-g8emcvdff0fqe2b8.canadacentral-01.azurewebsites.net/api/producto';
    let productosData = [];
    let categoriaActual = null;
    let productoAEliminarId = null;

    // ── Elementos del DOM ──
    const contenedorProductos   = document.getElementById('contenedor-productos');
    const contenedorCategorias  = document.getElementById('contenedor-categorias');
    const loadingProductos      = document.getElementById('loadingProductos');
    const inputBusqueda         = document.getElementById('inputBusqueda');
    const filtroOfertas         = document.getElementById('filtroOfertas');
    const contadorCarrito       = document.getElementById('contadorCarrito');
    let carrito = 0;

    // ── Modales (Bootstrap) ──
    const modalProducto         = new bootstrap.Modal(document.getElementById('modalProducto'));
    const formProducto          = document.getElementById('formProducto');
    const btnGuardar            = document.getElementById('btnGuardar');
    const checkOferta           = document.getElementById('enOferta');
    const contenedorPrecioOferta = document.getElementById('contenedorPrecioOferta');

    const modalDetalle          = new bootstrap.Modal(document.getElementById('modalDetalle'));
    const modalEliminar         = new bootstrap.Modal(document.getElementById('modalEliminar'));
    const btnConfirmarEliminar  = document.getElementById('btnConfirmarEliminar');

    // ── Inicializar ──
    cargarProductos();

    // ── Eventos ──
    if (inputBusqueda)  inputBusqueda.addEventListener('input', renderizarProductos);
    if (filtroOfertas)  filtroOfertas.addEventListener('change', renderizarProductos);

    checkOferta.addEventListener('change', () => {
        if (checkOferta.checked) {
            contenedorPrecioOferta.classList.remove('d-none');
        } else {
            contenedorPrecioOferta.classList.add('d-none');
            document.getElementById('precioOferta').value = '';
        }
    });

    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarProducto();
    });

    btnConfirmarEliminar.addEventListener('click', async () => {
        if (productoAEliminarId) {
            await eliminarProductoConfirmado(productoAEliminarId);
        }
    });

    // ── Funciones Principales ──

    async function cargarProductos() {
        if (loadingProductos) loadingProductos.style.display = 'block';
        contenedorProductos.innerHTML = '';

        try {
            const respuesta = await fetch(apiUrl);
            if (!respuesta.ok) throw new Error(`Error en la petición: ${respuesta.status}`);

            productosData = await respuesta.json();

            extraerCategorias();
            renderizarProductos();
        } catch (error) {
            console.error('Error al obtener los productos:', error);
            if (loadingProductos) loadingProductos.style.display = 'none';
            contenedorProductos.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger d-flex align-items-center gap-2" role="alert">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <span>No se pudieron cargar los productos. Por favor, intenta más tarde.</span>
                    </div>
                </div>`;
        }
    }

    function extraerCategorias() {
        const categoriasMap = new Map();

        productosData.forEach(prod => {
            const catId     = prod.categoriaId     !== undefined ? prod.categoriaId     : prod.CategoriaId;
            const catNombre = prod.categoriaNombre || prod.CategoriaNombre;
            if (catId !== undefined && catNombre && !categoriasMap.has(catId)) {
                categoriasMap.set(catId, catNombre);
            }
        });

        // Reconstruir menú lateral (botones clicables)
        contenedorCategorias.innerHTML = `
            <button class="list-group-item list-group-item-action active text-start" onclick="filtrarCategoria(null, this)">
                <i class="bi bi-grid-fill me-2"></i> Todo
            </button>
        `;

        // Poblar el select del modal
        const categoriaSelect = document.getElementById('categoriaSelect');
        categoriaSelect.innerHTML = '<option value="">Seleccione una...</option>';

        const iconos = ['bi-cpu', 'bi-gpu-card', 'bi-memory', 'bi-device-hdd', 'bi-motherboard', 'bi-display', 'bi-keyboard', 'bi-box', 'bi-laptop', 'bi-bag-heart', 'bi-house-door', 'bi-star'];
        let idx = 0;

        categoriasMap.forEach((nombre, id) => {
            const icon = iconos[idx % iconos.length];
            idx++;

            contenedorCategorias.innerHTML += `
                <button class="list-group-item list-group-item-action text-start" onclick="filtrarCategoria(${id}, this)">
                    <i class="bi ${icon} me-2 text-accent"></i> ${nombre}
                </button>
            `;

            categoriaSelect.innerHTML += `<option value="${id}|${nombre}">${nombre}</option>`;
        });
    }

    window.filtrarCategoria = (id, element) => {
        categoriaActual = id;

        document.querySelectorAll('#contenedor-categorias button').forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');

        renderizarProductos();
    };

    function renderizarProductos() {
        const textoBusqueda = inputBusqueda ? inputBusqueda.value.toLowerCase().trim() : '';
        const soloOfertas   = filtroOfertas ? filtroOfertas.checked : false;

        if (loadingProductos) loadingProductos.style.display = 'none';

        let productosFiltrados = productosData.filter(prod => {
            const nombre   = (prod.nombre   || prod.Nombre   || '').toLowerCase();
            const catId    = prod.categoriaId !== undefined ? prod.categoriaId : prod.CategoriaId;
            const enOferta = prod.enOferta    !== undefined ? prod.enOferta    : prod.EnOferta;

            const cumpleBusqueda  = nombre.includes(textoBusqueda);
            const cumpleCategoria = categoriaActual === null || catId === categoriaActual;
            const cumpleOferta    = !soloOfertas || enOferta;

            return cumpleBusqueda && cumpleCategoria && cumpleOferta;
        });

        contenedorProductos.innerHTML = '';

        if (productosFiltrados.length === 0) {
            contenedorProductos.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-search fs-1"></i>
                    <p class="mt-3">No se encontraron productos que coincidan con los filtros.</p>
                </div>`;
            return;
        }

        productosFiltrados.forEach(producto => {
            const id          = producto.id          !== undefined ? producto.id          : producto.Id;
            const nombre      = producto.nombre      || producto.Nombre      || '';
            const imagen      = producto.imagen      || producto.Imagen      || '';
            const descripcion = producto.descripcion || producto.Descripcion || '';
            const precio      = producto.precio      !== undefined ? producto.precio      : producto.Precio;
            const enOferta    = producto.enOferta    !== undefined ? producto.enOferta    : producto.EnOferta;
            const precioOferta = producto.precioOferta !== undefined ? producto.precioOferta : producto.PrecioOferta;
            const catNombre   = producto.categoriaNombre || producto.CategoriaNombre || '';

            let precioHtml = `<p class="product-price mb-2">Q${parseFloat(precio).toFixed(2)}</p>`;
            let badgeOferta = '';

            if (enOferta && precioOferta !== null && precioOferta !== undefined) {
                precioHtml = `
                    <p class="mb-2">
                        <span class="product-price text-danger me-2">Q${parseFloat(precioOferta).toFixed(2)}</span>
                        <small class="text-muted text-decoration-line-through">Q${parseFloat(precio).toFixed(2)}</small>
                    </p>`;
                badgeOferta = `<span class="position-absolute top-0 end-0 m-2 badge rounded-pill bg-danger shadow">¡Oferta!</span>`;
            }

            const col = document.createElement('div');
            col.className = 'col-sm-12 col-md-4 mb-4';
            col.innerHTML = `
                <div class="card product-card h-100 position-relative">
                    ${badgeOferta}
                    <img src="${imagen}" class="card-img-top img-fluid" alt="${nombre}"
                         style="cursor:pointer;" onclick="verDetalle(${id})">
                    <div class="card-body d-flex flex-column">
                        ${catNombre ? `<span class="badge bg-accent mb-2 align-self-start">${catNombre}</span>` : ''}
                        <h6 class="card-title text-truncate" title="${nombre}">${nombre}</h6>
                        <p class="card-text text-muted small flex-grow-1 text-truncate" title="${descripcion}">${descripcion}</p>
                        ${precioHtml}
                        <div class="d-flex gap-2 mt-auto">
                            <button class="btn btn-nm flex-grow-1 agregarCarrito">
                                <i class="bi bi-cart-plus me-1"></i>Agregar
                            </button>
                            <button class="btn btn-outline-secondary py-1 px-2" onclick="verDetalle(${id})" title="Ver detalle">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-primary py-1 px-2" onclick="abrirModalEditar(${id})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger py-1 px-2" onclick="confirmarEliminar(${id})" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;

            // Evento carrito
            col.querySelector('.agregarCarrito').addEventListener('click', () => {
                carrito++;
                if (contadorCarrito) contadorCarrito.textContent = carrito;
                mostrarToast(`"${nombre}" añadido al carrito`, 'success');
            });

            contenedorProductos.appendChild(col);
        });
    }

    // ── CRUD ──

    window.abrirModalCrear = () => {
        formProducto.reset();
        document.getElementById('productoId').value = 0;
        document.getElementById('modalProductoLabel').textContent = 'Registrar Nuevo Producto';
        contenedorPrecioOferta.classList.add('d-none');
        modalProducto.show();
    };

    window.abrirModalEditar = (id) => {
        const prod = productosData.find(p => (p.id !== undefined ? p.id : p.Id) === id);
        if (!prod) return;

        document.getElementById('productoId').value = id;
        document.getElementById('modalProductoLabel').textContent = 'Editar Producto';

        document.getElementById('nombre').value      = prod.nombre      || prod.Nombre      || '';
        document.getElementById('descripcion').value = prod.descripcion || prod.Descripcion || '';
        document.getElementById('precio').value      = prod.precio      !== undefined ? prod.precio      : prod.Precio;
        document.getElementById('imagen').value      = prod.imagen      || prod.Imagen      || '';

        const catId     = prod.categoriaId     !== undefined ? prod.categoriaId     : prod.CategoriaId;
        const catNombre = prod.categoriaNombre || prod.CategoriaNombre;
        document.getElementById('categoriaSelect').value = `${catId}|${catNombre}`;

        const enOferta = prod.enOferta !== undefined ? prod.enOferta : prod.EnOferta;
        checkOferta.checked = enOferta;

        if (enOferta) {
            contenedorPrecioOferta.classList.remove('d-none');
            document.getElementById('precioOferta').value = prod.precioOferta !== undefined ? prod.precioOferta : prod.PrecioOferta;
        } else {
            contenedorPrecioOferta.classList.add('d-none');
            document.getElementById('precioOferta').value = '';
        }

        modalProducto.show();
    };

    async function guardarProducto() {
        const id     = parseInt(document.getElementById('productoId').value);
        const catVal = document.getElementById('categoriaSelect').value;
        if (!catVal) {
            mostrarToast('Debe seleccionar una categoría.', 'warning');
            return;
        }
        const [catIdStr, catNombre] = catVal.split('|');

        const payload = {
            id,
            nombre:         document.getElementById('nombre').value.trim(),
            descripcion:    document.getElementById('descripcion').value.trim(),
            precio:         parseFloat(document.getElementById('precio').value),
            enOferta:       checkOferta.checked,
            precioOferta:   checkOferta.checked ? parseFloat(document.getElementById('precioOferta').value) : null,
            imagen:         document.getElementById('imagen').value.trim(),
            categoriaId:    parseInt(catIdStr),
            categoriaNombre: catNombre
        };

        const esEdicion = id > 0;
        const url    = esEdicion ? `${apiUrl}/${id}` : apiUrl;
        const method = esEdicion ? 'PUT' : 'POST';

        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...`;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                mostrarToast(`Producto ${esEdicion ? 'actualizado' : 'creado'} con éxito!`, 'success');
                modalProducto.hide();
                await cargarProductos();
            } else {
                mostrarToast('Error al guardar el producto.', 'danger');
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error de conexión.', 'danger');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar Producto';
        }
    }

    window.confirmarEliminar = (id) => {
        productoAEliminarId = id;
        modalEliminar.show();
    };

    async function eliminarProductoConfirmado(id) {
        btnConfirmarEliminar.disabled = true;
        btnConfirmarEliminar.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        try {
            const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            if (response.ok || response.status === 204) {
                mostrarToast('Producto eliminado correctamente.', 'success');
                modalEliminar.hide();
                await cargarProductos();
            } else {
                mostrarToast('No se pudo eliminar el producto.', 'danger');
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al conectar con la API.', 'danger');
        } finally {
            btnConfirmarEliminar.disabled = false;
            btnConfirmarEliminar.textContent = 'Eliminar';
            productoAEliminarId = null;
        }
    }

    window.verDetalle = (id) => {
        const prod = productosData.find(p => (p.id !== undefined ? p.id : p.Id) === id);
        if (!prod) return;

        const nombre       = prod.nombre      || prod.Nombre      || '';
        const imagen       = prod.imagen      || prod.Imagen      || '';
        const descripcion  = prod.descripcion || prod.Descripcion || '';
        const precio       = prod.precio      !== undefined ? prod.precio      : prod.Precio;
        const enOferta     = prod.enOferta    !== undefined ? prod.enOferta    : prod.EnOferta;
        const precioOferta = prod.precioOferta !== undefined ? prod.precioOferta : prod.PrecioOferta;
        const catNombre    = prod.categoriaNombre || prod.CategoriaNombre || '';

        let precioHtml = `<h3 class="fw-bold mb-4" style="color:var(--nm-accent-dark)">Q${parseFloat(precio).toFixed(2)}</h3>`;
        if (enOferta && precioOferta !== null) {
            precioHtml = `
                <div class="mb-4">
                    <span class="text-muted text-decoration-line-through fs-5 me-2">Q${parseFloat(precio).toFixed(2)}</span>
                    <span class="fw-bold text-danger fs-2">Q${parseFloat(precioOferta).toFixed(2)}</span>
                </div>`;
        }

        document.getElementById('detalleContenido').innerHTML = `
            <div class="row g-0">
                <div class="col-md-6 bg-light d-flex align-items-center justify-content-center p-4">
                    <img src="${imagen}" class="img-fluid rounded-4 shadow-sm" alt="${nombre}"
                         style="max-height: 380px; object-fit: contain;">
                </div>
                <div class="col-md-6 p-5 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-accent rounded-pill px-3 py-2">${catNombre}</span>
                        <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <h3 class="fw-bold mt-3">${nombre}</h3>
                    <p class="text-muted mt-3 mb-4 lh-lg">${descripcion}</p>
                    <div class="mt-auto border-top pt-4">
                        ${precioHtml}
                        <button class="btn btn-nm btn-lg w-100 rounded-pill shadow"
                                onclick="document.querySelector('.agregarCarrito[data-id=\\'${id}\\']')?.click() || agregarAlCarritoDesdeDetalle(${id})">
                            <i class="bi bi-cart-plus me-2"></i> Añadir al Carrito
                        </button>
                    </div>
                </div>
            </div>`;

        modalDetalle.show();
    };

    // Añadir al carrito desde el modal de detalle
    window.agregarAlCarritoDesdeDetalle = (id) => {
        const prod = productosData.find(p => (p.id !== undefined ? p.id : p.Id) === id);
        if (!prod) return;
        carrito++;
        if (contadorCarrito) contadorCarrito.textContent = carrito;
        const nombre = prod.nombre || prod.Nombre || '';
        mostrarToast(`"${nombre}" añadido al carrito`, 'success');
    };

    function mostrarToast(mensaje, tipo = 'primary') {
        const toastEl = document.getElementById('appToast');
        toastEl.className = `toast align-items-center text-white bg-${tipo} border-0`;
        document.getElementById('toastMensaje').textContent = mensaje;
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }
});
