const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patient = sequelize.define('Patient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identificación
  nombreCompleto: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tipoIdentificacion: {
    type: DataTypes.ENUM('rut', 'pasaporte'),
    allowNull: false,
    defaultValue: 'rut'
  },
  rut: {
    type: DataTypes.STRING(12),
    unique: true,
    allowNull: true,
    validate: {
      isRUT: function(value) {
        if (value && !this.validateRUT(value)) {
          throw new Error('RUT chileno inválido');
        }
      }
    }
  },
  pasaporte: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: true
  },
  
  // Información personal
  fechaNacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  prevision: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  edad: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.fechaNacimiento) return null;
      const today = new Date();
      const birthDate = new Date(this.fechaNacimiento);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  },
  telefono: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      isTelefonoChileno: function(value) {
        if (value && !/^(\+56)?[0-9]{9}$/.test(value)) {
          throw new Error('Teléfono chileno inválido. Formato: +56912345678 o 912345678');
        }
      }
    }
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  genero: {
    type: DataTypes.ENUM('masculino', 'femenino', 'otro'),
    allowNull: true
  },
  generoOtro: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Control
  medicamentosAsignados: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON con medicamentos asignados'
  },
  proximaVisita: {
    type: DataTypes.DATE,
    allowNull: true
  },
  numeroVisita: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo', 'en_tratamiento'),
    defaultValue: 'activo'
  }
}, {
  hooks: {
    beforeValidate: (patient) => {
      // Validar que tenga RUT o Pasaporte según tipo
      if (patient.tipoIdentificacion === 'rut' && !patient.rut) {
        throw new Error('RUT es obligatorio para pacientes chilenos');
      }
      if (patient.tipoIdentificacion === 'pasaporte' && !patient.pasaporte) {
        throw new Error('Pasaporte es obligatorio para pacientes extranjeros');
      }
      
      // Limpiar el otro campo de identificación
      if (patient.tipoIdentificacion === 'rut') {
        patient.pasaporte = null;
      } else {
        patient.rut = null;
      }
      
      // Limpiar géneroOtro si no es "otro"
      if (patient.genero !== 'otro') {
        patient.generoOtro = null;
      }
    }
  }
});

// Método para validar RUT chileno con dígito verificador
Patient.prototype.validateRUT = function(rut) {
  if (!rut) return false;
  
  // Limpiar puntos y guión
  rut = rut.replace(/\./g, '').replace('-', '');
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1).toLowerCase();
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplo = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : dvEsperado.toString();
  
  return dvCalculado === dv;
};

// Método para formatear RUT
Patient.prototype.formatRUT = function() {
  if (!this.rut) return '';
  const rut = this.rut.replace(/\./g, '').replace('-', '');
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
};

module.exports = Patient;