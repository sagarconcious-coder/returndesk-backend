import pool from "../../config/db.js";

/////////////////////////////////////// A) CREATE RMA

// rma_number VARCHAR(50) UNIQUE NOT NULL,
// dealer_id UUID NOT NULL REFERENCES dealers(id),
// product_serial VARCHAR(100) NOT NULL,
// product_name VARCHAR(255) NOT NULL,
// issue_description TEXT NOT NULL,
// status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVAL','REJECTED')),
// rejection_reason TEXT,
// created_at TIMESTAMPTZ DEFAULT NOW(),
// updated_at TIMESTAMPTZ DEFAULT NOW()

// createRma(dealer_id, rma_number, product_serial, product_name, issue_description)

export const createRma = async (
  dealer_id,
  rma_number,
  product_serial,
  product_name,
  issue_description,
) => {
  const result = await pool.query(
    // → INSERT into rmas table, RETURN the created RMA
    `INSERT INTO rmas
        (dealer_id,rma_number,product_serial,product_name,issue_description)
        VALUES ($1,$2,$3,$4,$5) RETURNING *`,[dealer_id,rma_number,product_serial,product_name,issue_description]
    );
    
    return result.rows[0];
};


// getRmaById(id)
export const getRmaById = async(id)=>{
    // → SELECT from rmas WHERE id=?
    const result = await pool.query(
        `SELECT * FROM rmas
        WHERE id=$1`,[id]
    )

    return result.rows[0];
}


// getRmaByNumber(rma_number)
export const getRmaByNumber = async(rma_number)=>{
    // → SELECT from rmas WHERE rma_number=?

    const result = await pool.query(
        `SELECT * FROM rmas
         WHERE rma_number=$1`,[rma_number]
    )
    return result.rows[0];
   
}

// getRmasByDealerId(dealer_id, status)
export const getRmasByDealerId = async(dealer_id,status)=>{
    // → SELECT from rmas WHERE dealer_id=? AND status=? (optional status filter)

    let query = `SELECT * FROM rmas WHERE dealer_id=$1` 
    const params = [dealer_id];
    if(status){
        query+=' AND status=$2';
        params.push(status);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query,params);
    return result.rows;
}



// getAllRmas(status)
export const getAllRmas = async(status=null)=>{
    // → SELECT from rmas WHERE status=? (for admin to see all RMAs)

    let query = 'SELECT * FROM rmas';
    const params = [];
    if(status){
        query+=' WHERE status=$1';
        params.push(status);
    }
    query+=' ORDER BY created_at DESC';
    
    const result = await pool.query(query,params);
    return result.rows;
}

// updateRmaStatus(id, status, rejection_reason)

export const updateRmaStatus = async(id,status,rejection_reason){
// → UPDATE rmas SET status=?, rejection_reason=?, updated_at=NOW() WHERE id=?

    const result = await pool.query(
      `UPDATE rmas 
      SET status=$1,rejection_reason=$2,updated_at=NOW() WHERE id=$3`,[status,rejection_reason,id]
    )

    return result.rows[0];
}
