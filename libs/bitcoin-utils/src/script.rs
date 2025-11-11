use crate::{BitcoinUtilsError, Result};

/// Bitcoin script opcodes
#[repr(u8)]
#[derive(Debug, Clone, Copy)]
pub enum OpCode {
    OpReturn = 0x6a,
    Op13 = 0x5d,
    OpPushData1 = 0x4c,
    OpPushData2 = 0x4d,
}

/// Build an OP_RETURN script with data
pub fn build_op_return_script(data: &[u8]) -> Result<Vec<u8>> {
    let mut script = Vec::new();

    // OP_RETURN
    script.push(OpCode::OpReturn as u8);

    // Push data
    if data.len() <= 75 {
        // Direct push
        script.push(data.len() as u8);
        script.extend_from_slice(data);
    } else if data.len() <= 255 {
        // OP_PUSHDATA1
        script.push(OpCode::OpPushData1 as u8);
        script.push(data.len() as u8);
        script.extend_from_slice(data);
    } else if data.len() <= 65535 {
        // OP_PUSHDATA2
        script.push(OpCode::OpPushData2 as u8);
        script.extend_from_slice(&(data.len() as u16).to_le_bytes());
        script.extend_from_slice(data);
    } else {
        return Err(BitcoinUtilsError::ScriptError(
            "Data too large for OP_RETURN".to_string(),
        ));
    }

    Ok(script)
}

/// Build a Runestone script (OP_RETURN OP_13 + data)
pub fn build_runestone_script(runestone_data: &[u8]) -> Result<Vec<u8>> {
    let mut script = Vec::new();

    // OP_RETURN
    script.push(OpCode::OpReturn as u8);

    // OP_13 (Runes protocol identifier)
    script.push(OpCode::Op13 as u8);

    // Add runestone data
    script.extend_from_slice(runestone_data);

    Ok(script)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_op_return_script_small() {
        let data = vec![1, 2, 3, 4];
        let script = build_op_return_script(&data).unwrap();
        assert_eq!(script[0], OpCode::OpReturn as u8);
        assert_eq!(script[1], 4); // Length
    }

    #[test]
    fn test_build_runestone_script() {
        let data = vec![1, 2, 3];
        let script = build_runestone_script(&data).unwrap();
        assert_eq!(script[0], OpCode::OpReturn as u8);
        assert_eq!(script[1], OpCode::Op13 as u8);
        assert_eq!(&script[2..], &data);
    }

    #[test]
    fn test_op_return_too_large() {
        let data = vec![0u8; 70000];
        assert!(build_op_return_script(&data).is_err());
    }
}
